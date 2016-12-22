const less = require('less');
const sysPath = require('path');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

class RecruiteeNg2Less {
	constructor(config) {
		this.config = config.plugins.recruitee || {};
		this.rootPath = config.paths.root;

		this._lessDeps = [];
	}

	compile(file) {
    let data = file.data;
    const path = file.path;
		const filename = file.path.split('/').pop();


		if (filename && data) {
			let cmpHostNameArr = filename.match(/(.*)\.component.less/);
			let cmpHostName = cmpHostNameArr && cmpHostNameArr.length ? cmpHostNameArr.pop() : false;

			if (!data) {
				console.log(`Style files seems to be empty: ${path}`);
			} else {

				if(cmpHostName) {
					const replacedHost = `rt-${cmpHostName}`;
					// console.log(`:host --> ${replacedHost} (${path})`);

					// replace :host selector
					data = data.replace(/:host /gm, replacedHost + ' ');

					// replace :host-context selector
					data = data.replace(/:host-context\((.*)\)/gm, '$1 ' + replacedHost);

					// remove /deep/ selector
					data = data.replace(/\/deep\/ /gm, '');

					// replace root-level :not selectors;
					data = data.replace(/^:not\((.*)\)/gm, `${replacedHost}:not($1)`);

				} else {
					console.log(`Component host selector could not be extracted from: ${path}`);
				}
			}
		}

		// compile and inline LESS
    const lessConfig = Object.assign({}, this.config, {
      paths: [this.rootPath, sysPath.dirname(path)],
      filename: path,
      dumpLineNumbers: !this.optimize && this.config.dumpLineNumbers
    });

		return this.compileLess(data, lessConfig).then(output => {
			this._lessDeps = output.imports;
			return Promise.resolve({ data: output.css });
		});

		return Promise.resolve(file);
	}

	getDependencies(data, path) {
		let deps = [];

		if (/\.less/.test(path)) {
			deps = [].concat(this._lessDeps);
			this._lessDeps = [];
		}

		return Promise.resolve(deps);
	}


	compileLess(data, config) {
		var prefixer = postcss([ autoprefixer ]);

    return less.render(data, config).then(
			output => {
				return prefixer.process(output.css).then(processed => {
					return {
						css: processed.css,
						imports: output.imports
					}
				});
			},
			err => {
	      let msg = `${err.type}Error: ${err.message}`;
	      if (err.filename) {
	        msg += ` in "${err.filename}:${err.line}:${err.column}"`;
	      }
	      throw msg;
    	}
		);
	}
}

RecruiteeNg2Less.prototype.brunchPlugin = true;
RecruiteeNg2Less.prototype.type = 'stylesheet';
RecruiteeNg2Less.prototype.extension = 'less';
module.exports = RecruiteeNg2Less;
