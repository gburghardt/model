Model.PropertyGetters = {

	included: function included(Klass) {
		if (Klass.addCallbacks) {
			Klass.addCallbacks("afterInitSchema", "_initAttributesAccessorProperty")
		}
	},

	prototype: {

		_initAttributesAccessorProperty: function _initAttributesAccessorProperty() {
			if (this.__proto__.hasOwnProperty("attributes")) {
				Object.defineProperty(this.__proto__, "attributes", {
					get: function attributesGetter() {
						return this._attributes;
					},
					set: function attributesSetter(attrs) {
						this.setAttributes(attrs);
					},
					enumerable: false
				});
			}
		},

		_createAttributeAccessor: function _createAttributeAccessor(key, name) {
			if (this.__proto__.hasOwnProperty(name)) {
				return;
			}

			Object.defineProperty(this.__proto__, name, {
				get: function attributeGetter() {
					return this.get(key);
				},
				set: function attributeSetter(value) {
					this.set(key, value);
					this.publish(this.eventPrefix + ".attributes.changed", {attributes: [key]});
				},
				enumerable: true
			});
		}

	}

};
