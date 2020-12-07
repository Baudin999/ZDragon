using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Records {

        [Fact(DisplayName = "Records - Only name")]
        public void Records_OnlyName() {
            var code = @"
record Person
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("", record.Description);
            Assert.Empty(record.Fields);
        }

        [Fact(DisplayName = "Records - Two types names only")]
        public void Records_TwoTypesNamesOnly() {
            var code = @"
record Person
record Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(2, compilerResult.Tokens.Count());
            Assert.Equal(2, compilerResult.Ast.Count());

            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("", record.Description);
            Assert.Empty(record.Fields);
        }

        [Fact(DisplayName = "Records - With annotations")]
        public void Records_WithAnnotations() {
            var code = @"
@ This is the person type
@ And here are the annotation.
record Person
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("This is the person type And here are the annotation.", record.Description);

        }

        [Fact(DisplayName = "Records - Few Simple Fields")]
        public void Records_FewSimpleFields() {
            var code = @"
@ This is the person type
@ And here are the annotation.
record Person =
    FirstName: string;
    LastName: string;
    Age: number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("This is the person type And here are the annotation.", record.Description);
            Assert.Equal(3, record.Fields.Count);

            var firstName = record.Fields[0];
            Assert.Equal("FirstName", firstName.Id);

            var lastName = record.Fields[1];
            Assert.Equal("LastName", lastName.Id);

            var age = record.Fields[2];
            Assert.Equal("Age", age.Id);

        }

        [Fact(DisplayName = "Records - Two types with a Few Simple Fields")]
        public void Records_FewSimpleFields2() {
            var code = @"
@ This is the person type
@ And here are the annotation.
record Person =
    FirstName: string;
    LastName: string;
    Age: number;
    Address: Address;
record Address =
    Street: string;
    HouseNumber: number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(2, compilerResult.Tokens.Count());
            Assert.Equal(2, compilerResult.Ast.Count());

            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("This is the person type And here are the annotation.", record.Description);
            Assert.Equal(4, record.Fields.Count);

            var firstName = record.Fields[0];
            Assert.Equal("FirstName", firstName.Id);

            var lastName = record.Fields[1];
            Assert.Equal("LastName", lastName.Id);

            var age = record.Fields[2];
            Assert.Equal("Age", age.Id);

            Assert.IsType<RecordNode>(compilerResult.Ast.Last());
            RecordNode addressRecord = (RecordNode)compilerResult.Ast.Last();
            Assert.Equal("Address", addressRecord.Id);
            Assert.Equal("", addressRecord.Description);
            Assert.Equal(2, addressRecord.Fields.Count);
        }


        [Fact(DisplayName = "Records - Default Field Value")]
        public void Records_DefaultFieldValue() {
            var code = @"
record Person =
    FirstName: string
        & default ""Peter Pan"";
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);

            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("", record.Description);
            Assert.Single(record.Fields);

            var firstName = record.Fields[0];
            Assert.Equal("FirstName", firstName.Id);
            Assert.Single(firstName.Restrictions);
            var defaultRestriction = firstName.Restrictions[0];
            Assert.Equal("default", defaultRestriction.Key);
            Assert.Equal("\"Peter Pan\"", defaultRestriction.Value);
        }

        [Fact(DisplayName = "Records - Parse Person Record")]
        public void Records_ParsePersonRecord() {
            var code = @"

@ The person record
@ extends the Mammal
record Person 'a 'b extends Mammal =

    FirstName: String;

    @ The last name
    @ And some more annotations
    LastName: Maybe String;

    Age: Number
        & min 0
        @ might have to be larger
        & max 100
    ;

";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);

            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("The person record extends the Mammal", record.Description);

            // Testing generic parameters
            Assert.Equal(2, record.GenericParameters.Count);
            Assert.Equal("'a", record.GenericParameters.First().Value);
            Assert.Equal("'b", record.GenericParameters.Last().Value);

            // testing extension
            Assert.Single(record.Extensions);
            Assert.Equal("Mammal", record.Extensions.First().Value);

            // Testing the fields
            Assert.Equal(3, record.Fields.Count);
            var firstNameField = record.Fields[0];
            Assert.Equal("", firstNameField.Description);
            Assert.Equal("FirstName", firstNameField.Id);
            Assert.Single(firstNameField.Types);
            Assert.Equal("String", firstNameField.Types[0]);
            Assert.Empty(firstNameField.Restrictions);

            var lastNameField = record.Fields[1];
            Assert.Equal("The last name And some more annotations", lastNameField.Description);
            Assert.Equal("LastName", lastNameField.Id);
            Assert.Equal(2, lastNameField.Types.Count);
            Assert.Equal("Maybe", lastNameField.Types[0]);
            Assert.Equal("String", lastNameField.Types[1]);
            Assert.Empty(lastNameField.Restrictions);

            var ageField = record.Fields[2];
            Assert.Equal("", ageField.Description);
            Assert.Equal("Age", ageField.Id);
            Assert.Single(ageField.Types);
            Assert.Equal("Number", ageField.Types[0]);
            Assert.Equal(2, ageField.Restrictions.Count);
            var minRestriction = ageField.Restrictions.First();
            Assert.Equal("min", minRestriction.Key);
            Assert.Equal("0", minRestriction.Value);

            var maxRestriction = ageField.Restrictions.Last();
            Assert.Equal("max", maxRestriction.Key);
            Assert.Equal("100", maxRestriction.Value);
        }

        [Fact(DisplayName = "Record - Unknown Field Type")]
        public void Record_UnknownFieldType() {
            var code = @"
record Person =
    FirstName: Name;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.ErrorSink.Errors);
        }
    }
}
