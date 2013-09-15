'@import Inherit.js';
'@import Events.ApplicationEvents';
'@import Events.Notifications';
'@import Callbacks';
'@import Callbacks.Utils';
'@import Model';

/*

Blog.Post = Model.Base.extend({
	prototype: {
		schema: {
			id: "Number",
			title: "String",
			body: "String",
			createdAt: "Date",
			updatedAt: "Date",
			authorId: "Number"
		},
		hasOne: {
			author: { className: "Blog.Author" }
		},
		hasMany: {
			tags: { className: "Blog.Tag", foreignKey: "post_id" }
		}
	}
});

var post = new Blog.Post();

post.tags -> Array<Blog.Tag>

*/

Model.Base = Object.extend({

	includes: [
		Callbacks.Utils,
		Events.ApplicationEvents,
		Events.Notifications
	],

	self: {

		guidBase: new Date().getTime() + "-" + Math.round(Math.random() * 1000000000),

		guidIndex: 0,

		createGuid: function createGuid() {
			return this.guidBase + "-" + (this.guidIndex++);
		}

	},

	prototype: {

		_attributes: null,

		_changedAttributes: null,

		eventPrefix: "model",

		guid: null,

		newRecord: true,

		previouslyChanged: null,

		primaryKey: "id",

		schema: null,

		initialize: function initialize(attributes) {
			this.guid = this.constructor.createGuid();
			this._attributes = {};
			this.previouslyChanged = {};
			this._changedAttributes = {};
			this.__proto__._createAttributeAccessor = this._createAttributeAccessor || this._createAttributeAccessorFunction;
			this._initApplicationEvents();
			this.initCallbacks();
			this._initSchema();

			if (attributes) {
				this.setAttributes(attributes);
			}

			this.newRecord = !this.getPrimaryKey();

			this.callbacks.execute("afterInitialize");

			attributes = null;
		},

		destructor: function destructor() {
			if (this.callbacks) {
				this.callbacks.execute("onDestroy");
				this.destroyCallbacks();
			}

			this.destroyApplicationEvents();

			this._attributes = this._changedAttributes = null;
		},

		_initSchema: function _initSchema() {
			if (this.__proto__.hasOwnProperty("_compiledSchema")) {
				return;
			}

			var compiledSchema = this.__proto__._compiledSchema = {};
			var proto = this.__proto__, schema, key, name;
			var regex = /_([a-zA-Z0-9])/g;

			while (proto) {
				if (proto.hasOwnProperty("schema")) {
					schema = proto.schema;

					for (key in schema) {
						if (!schema.hasOwnProperty(key) || compiledSchema.hasOwnProperty(key)) {
							continue;
						}

						compiledSchema[key] = schema[key];

						name = key.replace(regex, function(match, $1) {
							return $1.toUpperCase();
						});

						this._createAttributeAccessor(key, name);
					}
				}

				proto = proto.__proto__;
			}

			if (!compiledSchema.hasOwnProperty(this.primaryKey)) {
				compiledSchema[this.primaryKey] = "Number";
				this._createAttributeAccessor(this.primaryKey);
			}

			this.callbacks.execute("afterInitSchema");

			proto = compiledSchema = schema = null;
		},

		getAttributes: function getAttributes() {
			return this._attributes;
		},

		setAttributes: function setAttributes(attrs) {
			var publishChangedEvent = false;
			var keysChanged = [];

			for (var key in attrs) {
				if (attrs.hasOwnProperty(key)) {
					this.set(key, attrs[key]);

					if (this.previouslyChanged[key]) {
						keysChanged.push(key);
						publishChangedEvent = true;
					}
				}
			}

			if (publishChangedEvent) {
				this.publish(this.eventPrefix + ".attributes.changed", { attributes: keysChanged });
			}
		},

		getChangedAttributes: function getChangedAttributes() {
			return this._changedAttributes;
		},

		setChangedAttributes: function setChangedAttributes(o) {
			for (var key in o) {
				if (o.hasOwnProperty(key)) {
					this._changedAttributes[key] = o[key];
				}
			}
		},

		_createAttributeAccessorFunction: function _createAttributeAccessorFunction(key, name) {
			name = name || key;

			if (this.__proto__.hasOwnProperty(name)) {
				return;
			}

			this.__proto__[name] = function(value) {
				if (value === undefined) {
					return this.get(key);
				}
				else {
					this.set(key, value);
					this.publish(this.eventPrefix + ".attributes.changed", {attributes: [key]});
				}
			}
		},

		get: function get(key) {
			if (!this.isValidAttributeKey(key)) {
				throw new Error("Cannot get invalid attribute key: " + key);
			}

			return (this._attributes[key] === undefined) ? null : this._attributes[key];
		},

		getPrimaryKey: function getPrimaryKey() {
			return this._attributes[this.primaryKey];
		},

		convertAttributeValue: function convertAttributeValue(attributeClass, value) {
			if (value === null || value === undefined) {
				return null;
			}

			switch (attributeClass) {
			case "Number":
				return this.valueIsEmpty(value) ? null : Number(value);
				break;

			case "Boolean":
				return (/^(true|1)$/i).test(value);
				break;

			case "Date":
				return (value instanceof Date) ? value : new Date(value);

			default:
				return String(value);
				break;
			}
		},

		set: function set(key, value) {
			if (!this.isValidAttributeKey(key)) {
				return;
			}

			if (value !== this._attributes[key] && this._attributes[key] !== undefined) {
				this._changedAttributes[key] = this._attributes[key];
				this._attributes[key] = this.convertAttributeValue(this._compiledSchema[key], value);
				this.previouslyChanged[key] = true;
				this.publish(this.eventPrefix + ".attribute." + key + ".changed");
			}
			else {
				this._attributes[key] = this.convertAttributeValue(this._compiledSchema[key], value);
			}

			if (key == this.primaryKey && !this.previouslyChanged[key]) {
				this.newRecord = false;
			}
		},

		isValidAttributeKey: function isValidAttributeKey(key) {
			return this._compiledSchema.hasOwnProperty(key);
		},

		valueIsEmpty: function valueIsEmpty(value) {
			return (value === undefined || value === null || (/^\s*$/).test(value)) ? true : false;
		}

	}

});
