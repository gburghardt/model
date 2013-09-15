describe("Model", function() {

	describe("Base", function() {

		TestModel = Model.Base.extend();

		TestModelPrimaryKeyOverride = Model.Base.extend({
			prototype: {
				primaryKey: "foo_id"
			}
		});

		TestModelAttributes = Model.Base.extend({
			prototype: {
				eventPrefix: "testModelAttributes",
				schema: {
					firstName: "String",
					lastName: "String",
					typeId: "Number",
					employed: "Boolean",
					createdAt: "Date"
				}
			}
		});

		describe("_initSchema", function() {

			it("merges all the schema definitions from the class hierarchy", function() {
				var Parent = Model.Base.extend({
					prototype: {
						schema: {
							title: "String",
							description: "String"
						}
					}
				});
				var Child = Parent.extend({
					prototype: {
						schema: {
							price: "Number",
							url: "String"
						}
					}
				});

				var instance = new Child();

				expect(instance._compiledSchema).toEqual({
					title: "String",
					description: "String",
					price: "Number",
					url: "String",
					id: "Number"
				});
			});

			it("does not affect the schema definitions of parent classes", function() {
				var Parent = Model.Base.extend({
					prototype: {
						schema: {
							title: "String",
							description: "String"
						}
					}
				});
				var Child = Parent.extend({
					prototype: {
						schema: {
							price: "Number",
							url: "String"
						}
					}
				});

				var instance = new Child();

				expect(Parent.prototype._compiledSchema).toBe(undefined);
			});

			it("does not remerge the schema definitions after the first instance", function() {
				var Parent = Model.Base.extend({
					prototype: {
						schema: {
							title: "String",
							description: "String"
						}
					}
				});
				var Child = Parent.extend({
					prototype: {
						schema: {
							price: "Number",
							url: "String"
						}
					}
				});

				new Child();

				spyOn(Child.prototype, "hasOwnProperty").andCallThrough();
				spyOn(Child.prototype, "_createAttributeAccessor");

				new Child();

				expect(Child.prototype.hasOwnProperty).wasCalled();
				expect(Child.prototype._createAttributeAccessor).wasNotCalled();
			});

			it("creates accessor functions from the schema keys", function() {
				var SchemaTest = Model.Base.extend({
					prototype: {
						schema: {
							id: "Number",
							name: "String",
							createdAt: "Date"
						}
					}
				});

				var instance = new SchemaTest();

				expect(typeof(instance.id)).toBe("function");
				expect(typeof(instance.name)).toBe("function");
				expect(typeof(instance.createdAt)).toBe("function");
			});

			it("converts schema keys with underscores to camelCase accessor function names", function() {
				var SchemaTest = Model.Base.extend({
					prototype: {
						schema: {
							foo_bar: "String",
							foo_id: "Number",
							foo_bar_baz_id: "Number"
						}
					}
				});

				var instance = new SchemaTest();

				expect(typeof(instance.fooBar)).toBe("function");
				expect(typeof(instance.fooId)).toBe("function");
				expect(typeof(instance.fooBarBazId)).toBe("function");
			});

		});

		it("defines a primary key by default", function() {
			var o = new TestModel();
			expect(o.isValidAttributeKey("id")).toEqual(true);
			expect(o.id()).toBe(null);
		});

		it("allows sub classes to override the primary key", function() {
			var o = new TestModelPrimaryKeyOverride();
			expect(o.isValidAttributeKey("foo_id")).toEqual(true);
			expect(o.foo_id()).toBe(null);
		});

		it("set newRecord to true when instantiated with no primary key", function() {
			var model = new TestModelAttributes();
			expect(model.newRecord).toBe(true);
		});

		describe("get", function() {
			beforeEach(function() {
				this.model = new TestModelAttributes();
			});

			it("returns null when the key is undefined", function() {
				expect(this.model.firstName()).toBe(null);
			});

			it("returns null when the key is null", function() {
				this.model.firstName(null);
				expect(this.model.firstName()).toBe(null);
			});

			it("returns the attribute value at the given key", function() {
				this.model.firstName("Joe");
				expect(this.model.firstName()).toEqual("Joe");
			});
		});

		describe("set", function() {

			beforeEach(function() {
				this.model = new TestModelAttributes();
			});

			it("set a null value", function() {
				this.model.set("firstName", null);
				expect(this.model.get("firstName")).toBe(null);
				expect(this.model._changedAttributes.firstName).toBe(undefined);
			});

			it("set a non null value", function() {
				this.model.set("firstName", "Joey");
				expect(this.model.get("firstName")).toEqual("Joey");
				expect(this.model._changedAttributes.firstName).toBe(undefined);
			});

			it("set the changed attributes for non null values", function() {
				this.model.set("firstName", "Joey");
				this.model.set("firstName", "Eddy");
				expect(this.model.get("firstName")).toEqual("Eddy");
				expect(this.model._changedAttributes.firstName).toEqual("Joey");
			});

			it("set the changed attributes to null", function() {
				this.model.set("firstName", null);
				this.model.set("firstName", "Billy");
				expect(this.model._changedAttributes.firstName).toBe(null);
			});

			it("publishes attribute:<key>:changed", function() {
				spyOn(this.model, "publish").andCallThrough();
				this.model.set("firstName", "Bob");
				this.model.set("firstName", "Jane");
				expect(this.model.publish).wasCalledWith("testModelAttributes.attribute.firstName.changed");
			});

			it("set newRecord to false when setting the primary key for the first time", function() {
				expect(this.model.newRecord).toBe(true);
				this.model.set("id", 1234);
				expect(this.model.newRecord).toBe(false);
			});

			it("converts values to numbers for Number attributes", function() {
				this.model.typeId("42");
				expect(this.model.typeId()).toBe(42);

				this.model.typeId("42.5");
				expect(this.model.typeId()).toBe(42.5);

				this.model.typeId(NaN);
				expect(isNaN(this.model.typeId())).toBe(true);

				this.model.typeId("42.5 million");
				expect(isNaN(this.model.typeId())).toBe(true);
			});

			it("converts values to strings for String attributes", function() {
				this.model.set("firstName", 39);
				expect(this.model.firstName()).toBe("39");

				this.model.set("firstName", NaN);
				expect(this.model.firstName()).toBe("NaN");

				this.model.set("firstName", true);
				expect(this.model.firstName()).toBe("true");
			});

			it("converts boolean-like strings and values to true or false", function() {
				var values =         ["true", "false", "foo", "0",   "1",  "TruE", "TRUE", NaN,   0,     1];
				var expectedValues = [ true,   false,   false, false, true, true,   true,  false, false, true];

				for (var i = 0, length = values.length; i < length; i++) {
					this.model.set("employed", values[i]);
					expect(this.model.employed()).toBe(expectedValues[i]);
				}
			});

			it("converts date strings to Date objects", function() {
				this.model.createdAt("2013/02/20");
				expect(this.model.createdAt()).toBeInstanceof(Date);
			});

			it("keeps Date objects as Date objects", function() {
				var date = new Date();
				this.model.createdAt(date);
				expect(this.model.createdAt()).toBe(date);
			});

			it("maintains null values for all attribute types", function() {
				this.model.setAttributes({typeId: 23, firstName: "Test", lastName: "Test", employed: true});

				expect(this.model.typeId()).toEqual(23);
				expect(this.model.firstName()).toEqual("Test");
				expect(this.model.lastName()).toEqual("Test");
				expect(this.model.employed()).toBe(true);

				this.model.set("typeId", null);
				this.model.set("firstName", null);
				this.model.set("lastName", null);
				this.model.set("employed", null);

				expect(this.model.typeId()).toBe(null);
				expect(this.model.firstName()).toBe(null);
				expect(this.model.lastName()).toBe(null);
				expect(this.model.employed()).toBe(null);

				this.model.set("typeId", undefined);
				this.model.set("firstName", undefined);
				this.model.set("lastName", undefined);
				this.model.set("employed", undefined);

				expect(this.model.typeId()).toBe(null);
				expect(this.model.firstName()).toBe(null);
				expect(this.model.lastName()).toBe(null);
				expect(this.model.employed()).toBe(null);
			});

			it("converts unknown data types to strings", function() {
				var BadClass = Model.Base.extend({
					prototype: {
						schema: {
							bad: "Yada"
						}
					}
				});

				var o = new BadClass();
				o.set("bad", 12);
				expect(o.bad()).toEqual("12");
				o.set("bad", NaN);
				expect(o.bad()).toEqual("NaN");
			});

		});

		describe("set", function() {

			beforeEach(function() {
				this.model = new TestModelAttributes();
			});

			it("publishes attributes.changed", function() {
				spyOn(this.model, "publish").andCallThrough();
				this.model.setAttributes({firstName: "Test", lastName: "Foo"});
				expect(this.model.publish).wasNotCalled();

				this.model.setAttributes({firstName: "Jane", lastName: "Doe"});
				expect(this.model.publish).wasCalledWith( "testModelAttributes.attributes.changed", { attributes: [ "firstName", "lastName" ] } );
			});

		});

		describe("valueIsEmpty", function() {
			beforeEach(function() {
				this.model = new TestModel();
			});

			it("returns true for null values", function() {
				expect(this.model.valueIsEmpty(null)).toEqual(true);
			});

			it("returns true for undefined values", function() {
				var foo;
				expect(this.model.valueIsEmpty(foo)).toEqual(true);
			});

			it("returns false for NaN values", function() {
				expect(this.model.valueIsEmpty(NaN)).toBe(false);
			});

			it("returns true for empty strings", function() {
				expect(this.model.valueIsEmpty("")).toEqual(true);
			});

			it("returns true for strings containing only white space characters", function() {
				expect(this.model.valueIsEmpty("	\t	")).toEqual(true);
			});

			it("returns true for empty arrays", function() {
				expect(this.model.valueIsEmpty( [] )).toEqual(true);
			});

			it("returns false for everything else", function() {
				expect(this.model.valueIsEmpty( "abc" )).toEqual(false);
				expect(this.model.valueIsEmpty( 0 )).toEqual(false);
				expect(this.model.valueIsEmpty( -1 )).toEqual(false);
				expect(this.model.valueIsEmpty( 1 )).toEqual(false);
				expect(this.model.valueIsEmpty( {} )).toEqual(false);
				expect(this.model.valueIsEmpty( function() {} )).toEqual(false);
				expect(this.model.valueIsEmpty( true )).toEqual(false);
				expect(this.model.valueIsEmpty( false )).toEqual(false);
			});
		});

		describe("isValidAttributeKey", function() {
			it("returns false for invalid attributes", function() {
				var o = new TestModelAttributes();
				expect(o.isValidAttributeKey("non_existent")).toEqual(false);
				expect(o.isValidAttributeKey("Name")).toEqual(false);
			});

			it("returns true for valid attributes", function() {
				var o = new TestModelAttributes();
				expect(o.isValidAttributeKey("firstName")).toEqual(true);
				expect(o.isValidAttributeKey("lastName")).toEqual(true);
				expect(o.isValidAttributeKey("id")).toEqual(true);
			});
		});

		describe("_initSchema", function() {

			var Klass = Model.Base.extend({
				prototype: {
					schema: { name: "String" }
				}
			});

			it("compiles the schema when first instantiated", function() {
				expect(Klass.prototype.hasOwnProperty("_compiledSchema")).toBe(false);

				var instance = new Klass();

				expect(Klass.prototype.hasOwnProperty("_compiledSchema")).toBe(true);
			});

			it("does not recompile the schema with subsequent instances", function() {
				var compiledSchema = Klass.prototype._compiledSchema;
				var instance = new Klass();

				expect(Klass.prototype._compiledSchema).toBe(compiledSchema);
			});

		});

		describe("initialize", function() {
			it("assigns attributes", function() {
				var o = new TestModelAttributes({id: 123, firstName: "John", lastName: "Doe"});
				expect(o.id()).toEqual(123);
				expect(o.firstName()).toEqual("John");
				expect(o.lastName()).toEqual("Doe");
			});

			it("ignores invalid attributes", function() {
				var o = new TestModelAttributes({id: 123, invalidAttr: "foo"});
				expect(o.hasOwnProperty("invalidAttr")).toEqual(false);
				expect(o.invalidAttr).toBe(undefined);
				expect(function() {
					o.get("invalidAttr");
				}).toThrow("Cannot get invalid attribute key: invalidAttr");
			});

			it("does not require attributes", function() {
				expect(function() {
					var o = new TestModelAttributes();
				}).not.toThrow(Error);
			});
		});

		describe("attributes", function() {

			describe("getters", function() {
				it("return null when no attribute was given", function() {
					var o = new TestModelAttributes();
					expect(o.id()).toBe(null);
					expect(o.firstName()).toBe(null);
					expect(o.lastName()).toBe(null);
				});

				it("return the value", function() {
					var o = new TestModelAttributes({id: 123});
					expect(o.id()).toEqual(123);
					expect(o.firstName()).toBe(null);
					expect(o.lastName()).toBe(null);
				});
			});

			describe("setters", function() {

				it("put entries in the _changedAttributes", function() {
					var o = new TestModelAttributes({firstName: "Fred"});
					expect(o._changedAttributes.id).toBe(undefined);
					expect(o._changedAttributes.firstName).toBe(undefined);
					o.id(123);
					o.firstName("Joe");
					expect(o.id()).toEqual(123);
					expect(o.firstName()).toEqual("Joe");
					expect(o._changedAttributes.id).toBe(undefined);
					expect(o._changedAttributes.firstName).toEqual("Fred");
				});

				it("publishes attributes.changed", function() {
					var o = new TestModelAttributes();
					spyOn(o, "publish");
					o.setAttributes({firstName: "Joey", lastName: "Smith"});
					expect(o.publish).wasNotCalled();
					o.firstName("Billy");
					o.lastName("Bob");

					expect(o.publish).wasCalledWith( "testModelAttributes.attribute.firstName.changed" );
					expect(o.publish).wasCalledWith( "testModelAttributes.attribute.lastName.changed");
					expect(o.publish).wasCalledWith( "testModelAttributes.attributes.changed", { attributes: [ "firstName" ] } );
					expect(o.publish).wasCalledWith( "testModelAttributes.attributes.changed", { attributes: [ "lastName" ] } );
				});

			});

			it("set newRecord to false when the primary key is added", function() {
				var o = new TestModelAttributes();
				expect(o.newRecord).toBe(true);
				o.setAttributes({id: 1234});
				expect(o.newRecord).toBe(false);
			});
		});

		describe("child classes", function() {

			it("combines the schemas of all parent classes", function() {
				var ParentClass = Model.Base.extend({
					prototype: {
						schema: {name: "String", description: "String"}
					}
				});

				var ChildClass = ParentClass.extend({
					prototype: {
						schema: {price: "Number", quantity: "Number"}
					}
				});

				expect(ChildClass.prototype.hasOwnProperty("_compiledSchema")).toBe(false);

				var child = new ChildClass({name: "Testing", description: "Just a test", price: 33.99, quantity: 10});

				expect(ParentClass.prototype.hasOwnProperty("_compiledSchema")).toBe(false);
				expect(ChildClass.prototype.hasOwnProperty("_compiledSchema")).toBe(true);
				expect(ChildClass.prototype.hasOwnProperty("name")).toBe(true);
				expect(ChildClass.prototype.hasOwnProperty("description")).toBe(true);
				expect(ChildClass.prototype.hasOwnProperty("price")).toBe(true);
				expect(ChildClass.prototype.hasOwnProperty("quantity")).toBe(true);
				expect(ChildClass.prototype.hasOwnProperty("id")).toBe(true);

				expect(child.name()).toEqual("Testing");
				expect(child.description()).toEqual("Just a test");
				expect(child.price()).toEqual(33.99);
				expect(child.quantity()).toEqual(10);
			});

		});

	});

});
