heyutils
========

**heyutils** is common API with *nodejs*.

csv2obj
-------
a minimalist csv file reading tool for js object.

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
a mul-platform shell, it support sync shell code, and provide more mul-platform shell commands, like 'heycp' etc.

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
a widget of the files, it support wildcard file copy, etc.

stringutils
-----------
a widget of the string, it support wildcard, command, path, etc.

arrutils
--------
a widget of the array.

xmlutils
--------
a widget of the xmldom.
