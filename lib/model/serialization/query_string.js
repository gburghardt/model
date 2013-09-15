'@import Model.Serialization';

Model.Serialization.QueryString = {

	prototype: {

		toQueryString: function toQueryString(options) {
			options.merge({
				rootElementPrefix: "[",
				rootElementSuffix: "]"
			}, true);

			var attrs = null, key, queryString = [];

			if (options.changedAttributesOnly) {
				var changedAttributes = this._changedAttributes;
				attrs = {};

				for (key in changedAttributes) {
					if (changedAttributes.hasOwnProperty(key) && changedAttributes[key]) {
						attrs[key] = this._attributes[key];
					}
				}

				attrs[this.primaryKey] = this._attributes[this.primaryKey];
			}
			else {
				attrs = this._attributes;
			}

			if (options.rootElement) {
				for (key in attrs) {
					if (attrs.hasOwnProperty(key) && !this.valueIsEmpty(attrs[key])) {
						queryString.push(options.rootElement + options.rootElementPrefix + escape(key) + options.rootElementSuffix + "=" + escape(attrs[key]));
					}
				}
			}
			else {
				for (key in attrs) {
					if (attrs.hasOwnProperty(key) && !this.valueIsEmpty(attrs[key])) {
						queryString.push(escape(key) + "=" + escape(attrs[key]));
					}
				}
			}

			this.callbacks.execute("serialize.to.queryString", { options: options, queryString: queryString } );

			return queryString.join("&");
		}

	}

};

Model.Base.include(Model.Serialization.QueryString);
