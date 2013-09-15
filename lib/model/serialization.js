// @import Hash

Model.Serialization = {

	included: function included(Klass) {
		if (Klass.addCallbacks) {
			Klass.addCallbacks("afterInitialize", "_initSerialization");
		}
	},

	prototype: {

		serializeOptions: {
			changedAttributesOnly: true,
			format: "queryString"
		},

		_initSerialization: function _initSerialization() {
			if (this.__proto__.hasOwnProperty("_serializeOptions")) {
				return;
			}

			var proto = this.__proto__, serializeOptions = new Hash();

			while (proto) {
				if (proto.hasOwnProperty("serializeOptions")) {
					serializeOptions.merge(proto.serializeOptions, true);
				}

				proto = proto.__proto__;
			}

			this.__proto__._serializeOptions = serializeOptions;
		},

		escapeHTML: function(x) {
			return String(x).replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&apos;");
		},

		serialize: function(options) {
			options = this._serializeOptions.merge(options || {});
			var format = options.format;
			var methodName = "to" + format.charAt(0).toUpperCase() + format.slice(1, format.length);
			var x;

			if (this[methodName]) {
				x = this[methodName](options);
			}
			else {
				throw new Error("Error serializing object: " + methodName + " is not a function");
			}

			return x;
		}

	}

};

Model.Base.include(Model.Serialization);
