///<reference path="../.d.ts"/>
"use strict";
var Future = require("fibers/future");
var path = require("path");
var marked = require("marked");
var HtmlHelpService = (function () {
    function HtmlHelpService($logger, $injector, $errors, $fs, $staticConfig, $microTemplateService, $opener, $commandsServiceProvider) {
        this.$logger = $logger;
        this.$injector = $injector;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.$microTemplateService = $microTemplateService;
        this.$opener = $opener;
        this.$commandsServiceProvider = $commandsServiceProvider;
        this.pathToImages = this.$staticConfig.HTML_CLI_HELPERS_DIR;
        this.pathToHtmlPages = this.$staticConfig.HTML_PAGES_DIR;
        this.pathToManPages = this.$staticConfig.MAN_PAGES_DIR;
    }
    Object.defineProperty(HtmlHelpService.prototype, "pathToStylesCss", {
        get: function () {
            return path.join(this.$staticConfig.HTML_COMMON_HELPERS_DIR, "styles.css");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HtmlHelpService.prototype, "pathToBasicPage", {
        get: function () {
            return path.join(this.$staticConfig.HTML_COMMON_HELPERS_DIR, "basic-page.html");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HtmlHelpService.prototype, "pathToIndexHtml", {
        get: function () {
            return path.join(this.$staticConfig.HTML_PAGES_DIR, "index.html");
        },
        enumerable: true,
        configurable: true
    });
    HtmlHelpService.prototype.generateHtmlPages = function () {
        var _this = this;
        return (function () {
            var mdFiles = _this.$fs.enumerateFilesInDirectorySync(_this.pathToManPages);
            var basicHtmlPage = _this.$fs.readFile(_this.pathToBasicPage).wait().toString();
            var futures = _.map(mdFiles, function (markdownFile) { return _this.createHtmlPage(basicHtmlPage, markdownFile); });
            Future.wait(futures);
            _this.$logger.trace("Finished generating HTML files.");
        }).future()();
    };
    HtmlHelpService.prototype.createHtmlPage = function (basicHtmlPage, pathToMdFile) {
        var _this = this;
        return (function () {
            var mdFileName = path.basename(pathToMdFile);
            var htmlFileName = mdFileName.replace(HtmlHelpService.MARKDOWN_FILE_EXTENSION, HtmlHelpService.HTML_FILE_EXTENSION);
            _this.$logger.trace("Generating '%s' help topic.", htmlFileName);
            var helpText = _this.$fs.readText(pathToMdFile).wait();
            var outputText = _this.$microTemplateService.parseContent(helpText, { isHtml: true });
            var htmlText = marked(outputText);
            var filePath = pathToMdFile
                .replace(path.basename(_this.pathToManPages), path.basename(_this.pathToHtmlPages))
                .replace(mdFileName, htmlFileName);
            _this.$logger.trace("HTML file path for '%s' man page is: '%s'.", mdFileName, filePath);
            var outputHtml = basicHtmlPage
                .replace(HtmlHelpService.MAN_PAGE_NAME_REGEX, mdFileName.replace(HtmlHelpService.MARKDOWN_FILE_EXTENSION, ""))
                .replace(HtmlHelpService.HTML_COMMAND_HELP_REGEX, htmlText)
                .replace(HtmlHelpService.RELATIVE_PATH_TO_STYLES_CSS_REGEX, path.relative(path.dirname(filePath), _this.pathToStylesCss))
                .replace(HtmlHelpService.RELATIVE_PATH_TO_IMAGES_REGEX, path.relative(path.dirname(filePath), _this.pathToImages))
                .replace(HtmlHelpService.RELATIVE_PATH_TO_INDEX_REGEX, path.relative(path.dirname(filePath), _this.pathToIndexHtml));
            _this.$fs.writeFile(filePath, outputHtml).wait();
            _this.$logger.trace("Finished writing file '%s'.", filePath);
        }).future()();
    };
    HtmlHelpService.prototype.openHelpForCommandInBrowser = function (commandName) {
        var _this = this;
        return (function () {
            var htmlPage = _this.convertCommandNameToFileName(commandName) + HtmlHelpService.HTML_FILE_EXTENSION;
            _this.$logger.trace("Opening help for command '%s'. FileName is '%s'.", commandName, htmlPage);
            _this.$fs.ensureDirectoryExists(_this.pathToHtmlPages).wait();
            if (!_this.tryOpeningSelectedPage(htmlPage)) {
                _this.$logger.trace("Required HTML file '%s' is missing. Let's try generating HTML files and see if we'll find it.", htmlPage);
                _this.generateHtmlPages().wait();
                if (!_this.tryOpeningSelectedPage(htmlPage)) {
                    _this.$errors.failWithoutHelp("Unable to find help for '%s'", commandName);
                }
            }
        }).future()();
    };
    HtmlHelpService.prototype.convertCommandNameToFileName = function (commandName) {
        var defaultCommandMatch = commandName.match(/(\w+?)\|\*/);
        if (defaultCommandMatch) {
            this.$logger.trace("Default command found. Replace current command name '%s' with '%s'.", commandName, defaultCommandMatch[1]);
            commandName = defaultCommandMatch[1];
        }
        var availableCommands = this.$injector.getRegisteredCommandsNames(true).sort();
        this.$logger.trace("List of registered commands: %s", availableCommands.join(", "));
        if (commandName && _.startsWith(commandName, this.$commandsServiceProvider.dynamicCommandsPrefix) && !_.contains(availableCommands, commandName)) {
            var dynamicCommands = this.$commandsServiceProvider.getDynamicCommands().wait();
            if (!_.contains(dynamicCommands, commandName)) {
                this.$errors.failWithoutHelp("Unknown command '%s'. Try '$ %s help' for a full list of supported commands.", commandName, this.$staticConfig.CLIENT_NAME.toLowerCase());
            }
        }
        return commandName.replace(/\|/g, "-") || "index";
    };
    HtmlHelpService.prototype.tryOpeningSelectedPage = function (htmlPage) {
        var fileList = this.$fs.enumerateFilesInDirectorySync(this.pathToHtmlPages);
        this.$logger.trace("File list: " + fileList);
        var pageToOpen = _.find(fileList, function (file) { return path.basename(file) === htmlPage; });
        if (pageToOpen) {
            this.$logger.trace("Found page to open: '%s'", pageToOpen);
            this.$opener.open(pageToOpen);
            return true;
        }
        this.$logger.trace("Unable to find file: '%s'", htmlPage);
        return false;
    };
    HtmlHelpService.prototype.readMdFileForCommand = function (commandName) {
        var _this = this;
        return (function () {
            var mdFileName = _this.convertCommandNameToFileName(commandName) + HtmlHelpService.MARKDOWN_FILE_EXTENSION;
            _this.$logger.trace("Reading help for command '%s'. FileName is '%s'.", commandName, mdFileName);
            var markdownFile = _.find(_this.$fs.enumerateFilesInDirectorySync(_this.pathToManPages), function (file) { return path.basename(file) === mdFileName; });
            if (markdownFile) {
                return _this.$fs.readText(markdownFile).wait();
            }
            _this.$errors.failWithoutHelp("Unknown command '%s'. Try '$ %s help' for a full list of supported commands.", mdFileName.replace(".md", ""), _this.$staticConfig.CLIENT_NAME.toLowerCase());
        }).future()();
    };
    HtmlHelpService.prototype.getCommandLineHelpForCommand = function (commandName) {
        var _this = this;
        return (function () {
            var helpText = _this.readMdFileForCommand(commandName).wait();
            var outputText = _this.$microTemplateService.parseContent(helpText, { isHtml: false })
                .replace(/&nbsp;/g, " ")
                .replace(HtmlHelpService.MARKDOWN_LINK_REGEX, "$1");
            return outputText;
        }).future()();
    };
    HtmlHelpService.MARKDOWN_FILE_EXTENSION = ".md";
    HtmlHelpService.HTML_FILE_EXTENSION = ".html";
    HtmlHelpService.MAN_PAGE_NAME_REGEX = /@MAN_PAGE_NAME@/g;
    HtmlHelpService.HTML_COMMAND_HELP_REGEX = /@HTML_COMMAND_HELP@/g;
    HtmlHelpService.RELATIVE_PATH_TO_STYLES_CSS_REGEX = /@RELATIVE_PATH_TO_STYLES_CSS@/g;
    HtmlHelpService.RELATIVE_PATH_TO_IMAGES_REGEX = /@RELATIVE_PATH_TO_IMAGES@/g;
    HtmlHelpService.RELATIVE_PATH_TO_INDEX_REGEX = /@RELATIVE_PATH_TO_INDEX@/g;
    HtmlHelpService.MARKDOWN_LINK_REGEX = /\[([\w \-\`\<\>\*\:\\]+?)\]\([\s\S]+?\)/g;
    return HtmlHelpService;
})();
exports.HtmlHelpService = HtmlHelpService;
$injector.register("htmlHelpService", HtmlHelpService);
