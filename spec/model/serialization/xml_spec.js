describe("Model", function() {
describe("Serialization", function() {
describe("Xml", function() {

	var Product = Model.Base.extend({
		prototype: {
			schema: {
				name: "String",
				description: "String",
				price: "Number",
				notes: "String",
				phone: "String"
			}
		}
	});

	describe("toXml", function() {

		beforeEach(function() {
			this.model = new Product({
				id: 1234,
				name: "Paint",
				description: "Red<br>\"matte\"",
				price: 15.99,
				notes: "Per gallon",
				phone: null
			});
		});

		it("converts attributes to XML with no root element", function() {
			var xml = [
				'<id>1234</id>',
				'<name>Paint</name>',
				'<description>Red&lt;br&gt;&quot;matte&quot;</description>',
				'<price>15.99</price>',
				'<notes>Per gallon</notes>'
			].join("");

			expect(this.model.toXml({})).toEqual(xml);
		});

		it("converts attributes to XML with a root element", function() {
			var xml = [
				'<test_validation>',
					'<id>1234</id>',
					'<name>Paint</name>',
					'<description>Red&lt;br&gt;&quot;matte&quot;</description>',
					'<price>15.99</price>',
					'<notes>Per gallon</notes>',
				'</test_validation>'
			].join("");

			expect(this.model.toXml({rootElement: "test_validation"})).toEqual(xml);
		});

		it("converts attributes to XML using shorthand syntax", function() {
			var xml = '<test_validation id="1234" name="Paint" description="Red&lt;br&gt;&quot;matte&quot;" price="15.99" notes="Per gallon" />';

			expect(this.model.toXml({rootElement: 'test_validation', shorthand: true})).toEqual(xml);
		});

		it("converts changed attributes to xml", function() {
			var xml = [
				'<name>Stain</name>',
				'<id>1234</id>'
			].join("");
			this.model.name("Stain");
			expect(this.model.toXml({changedAttributesOnly: true})).toEqual(xml);
		});

		it("throws an error when passing shorthand = true and omitting rootElement", function() {
			var model = this.model;

			expect(function() {
				model.toXml({shorthand: true});
			}).toThrow("Missing argument: options.rootElement is required when converting to XML using shorthand format");
		});

		it("triggers the serialize.to.xml callback", function() {
			spyOn(this.model.callbacks, "execute");
			this.model.toXml({});

			expect(this.model.callbacks.execute).wasCalledWith("serialize.to.xml", {options: {}, xml: [ '<id>1234</id>', '<name>Paint</name>', '<description>Red&lt;br&gt;&quot;matte&quot;</description>', '<price>15.99</price>', '<notes>Per gallon</notes>' ]});
		})

	});

});
});
});
