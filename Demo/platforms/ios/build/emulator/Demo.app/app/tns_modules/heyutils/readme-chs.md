heyutils
========

**heyutils**是**HeySDK**维护的一组*nodejs*小工具集。

里面包含

csv2obj
-------
一个极简的csv文件读取为js对象的工具

	var csv2obj = require('./csv2obj.js');
	var fs = require('fs');

	fs.readFile('test.csv', function(err, data) {
		if (err) {
			console.log('read ' + csvfile + ' fail!');

			return ;
		}

		var csvinfo = csv2obj.csv2obj(data.toString());
	});


exec
----
一个跨平台的shell执行器，支持线性执行shell代码，并提供一组更方便的跨平台shell命令，heycp等

	var exec = require('./exec');

	var lst = [];

	exec.addCmdEx(lst, 'rpm -ivh http://nginx.org/packages/centos/6/noarch/RPMS/nginx-release-centos-6-0.el6.ngx.noarch.rpm', './');
	exec.addCmdEx(lst, 'rpm -ivh http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm', './');
	exec.addCmdEx(lst, 'yum -y update', './');
	exec.addCmdEx(lst, 'yum -y install nginx', './');
	exec.addCmdEx(lst, 'yum -y install php-fpm', './');
	exec.addCmdEx(lst, 'yum -y install php-pecl-apc', './');
	exec.addCmdEx(lst, 'yum -y install php-mysql', './');
	exec.addCmdEx(lst, 'yum -y install php-redis', './');
	exec.addCmdEx(lst, 'yum -y install mysql', './');
	exec.addCmdEx(lst, 'yum -y install redis', './');
	exec.addCmdEx(lst, 'yum -y install npm', './');
	exec.addCmdEx(lst, 'yum -y install nodejs', './');
	exec.addCmdEx(lst, 'yum -y install python', './');
	exec.addCmdEx(lst, 'yum -y install svn', './');
	exec.addCmdEx(lst, 'yum -y install php-gd', './');

	exec.addCmdEx(lst, 'chkconfig redis on', './');

	exec.addCmdEx(lst, 'mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bfsan.old', './');
	exec.addCmdEx(lst, 'mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bfsan.old', './');
	exec.addCmdEx(lst, 'cp nginx/nginx.conf /etc/nginx/', './');
	exec.addCmdEx(lst, 'cp nginx/conf.d/default.conf /etc/nginx/conf.d/', './');
	exec.addCmdEx(lst, 'chkconfig nginx on', './');

	exec.addCmdEx(lst, 'mv /etc/php.ini /etc/php.ini.bfsan.old', './');
	exec.addCmdEx(lst, 'mv /etc/php-fpm.d/www.conf /etc/php-fpm.d/www.conf.bfsan.old', './');
	exec.addCmdEx(lst, 'cp php/php.ini /etc/', './');
	exec.addCmdEx(lst, 'cp php/php.d/apc.ini /etc/php.d/', './');
	exec.addCmdEx(lst, 'cp php/php-fpm.d/www.conf /etc/php-fpm.d/', './');
	exec.addCmdEx(lst, 'chkconfig php-fpm on', './');

	exec.addCmdEx(lst, 'mkdir /var/lib/php/session', './');
	exec.addCmdEx(lst, 'chmod 777 -R /var/lib/php/session', './');

	exec.addCmdEx(lst, 'mv /etc/sysconfig/iptables /etc/sysconfig/iptables.bfsan.old', './');
	exec.addCmdEx(lst, 'cp sysconfig/iptables /etc/sysconfig/iptables', './');

	exec.addCmdEx(lst, 'cp html/* /var/www/html/', './');

	exec.addCmdEx(lst, 'wget http://sourceforge.net/projects/phpmyadmin/files/phpMyAdmin/4.2.11/phpMyAdmin-4.2.11-english.tar.gz', '/var/www/html');
	exec.addCmdEx(lst, 'tar -zxvf phpMyAdmin-4.2.11-english.tar.gz', '/var/www/html');
	exec.addCmdEx(lst, 'mv phpMyAdmin-4.2.11-english tpm', '/var/www/html');
	exec.addCmdEx(lst, 'chmod 777 -R tpm', '/var/www/html');
	exec.addCmdEx(lst, 'rm phpMyAdmin-4.2.11-english.tar.gz', '/var/www/html');

	exec.addCmdEx(lst, 'mv ~/.subversion/servers ~/.subversion/servers.old', './');
	exec.addCmdEx(lst, 'cp .subversion/servers ~/.subversion/servers', './');

	exec.addCmdEx(lst, 'shutdown -r now', './');

	exec.runQueue(lst, 0);

fileutils
---------
文件相关的小工具，支持通配符的文件拷贝等

stringutils
-----------
字符串相关的小工具，支持通配符相关的字符串比对，支持目录和命令行的操作

arrutils
-----------
方便数组操作的通用接口

xmlutils
--------
xmldom的一层封装，方便更好的操作xml