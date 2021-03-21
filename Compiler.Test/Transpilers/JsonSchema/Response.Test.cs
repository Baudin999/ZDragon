using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Schema;
using System;
using System.Collections.Generic;
using Xunit;
using ZDragon.Transpilers.OpenAPI;

namespace Transpilers {

    public class Response : IDisposable {

        private readonly JSchema schema;

        public Response() {
            var code = @"
record Error =
    Code: Number;
    Message: String;

record Error404 extends Error
record Error500 extends Error

record Person =
    FirstName: String;

record KeyValue =
    Key: String;
    Value: String;

record ValidResponse =
    Headers: List KeyValue;
    Body: Person;

data Response =
    | ValidResponse
    | Error404
";
            var result = new Compiler.Compiler(code).Compile().Check();
            var transpiler = new JsonSchemaTranspiler(result.Lexicon["Response"], result.Lexicon);


            // weird hack to get Newtonsoft to work properly
            var _schema = transpiler.Transpile();
            var schemaText = _schema.ToString();
            schema = JSchema.Parse(schemaText);
        }

        public void Dispose() {
            // cleanup
        }


        [Fact(DisplayName = "Response - Schema exists")]
        public void Response_SchemaExists() {
            Assert.NotNull(schema);
        }

        [Fact(DisplayName = "Response - Test simple json 001")]
        public void Response_TestSimpleJson001() {


            // check all fields
            JToken person = JToken.Parse(@"
{
    'Code': 404,
    'Message': 'Failed to fetch'
}
");
            IList<ValidationError> errors;
            bool valid = person.IsValid(schema, out errors);

            Assert.True(valid);
            Assert.Empty(errors);
        }


        [Fact(DisplayName = "Response - Test simple json 002")]
        public void Response_TestSimpleJson002() {


            // check all fields
            JToken person = JToken.Parse(@"
{
    'Headers': [],
    'Body': {
        'FirstName': 'Peter'
    }
}
");
            IList<ValidationError> errors;
            bool valid = person.IsValid(schema, out errors);

            Assert.True(valid);
            Assert.Empty(errors);
        }



    }
}
