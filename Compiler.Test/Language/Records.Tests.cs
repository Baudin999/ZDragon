using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Language {
    public class Records {

        [Fact(DisplayName = "Records - Only name")]
        public void Records_OnlyName() {
            var code = @"
record Person
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.IsType<RecordNode>(compilerResult.Ast.First());
            RecordNode record = (RecordNode)compilerResult.Ast.First();
            Assert.Equal("Person", record.Id);
            Assert.Equal("", record.Description);
            Assert.Empty(record.Fields);

            Assert.Equal(ExpressionKind.RecordExpression, ((RecordNode)compilerResult.Ast[0]).ExpressionKind);
        }

        [Fact(DisplayName = "Records - Capital vs Lower Case")]
        public void Records_CapitalVSLowerCase() {
            var code = @"
record person =
    name: String;
";
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.Equal(ErrorKind.InvalidIdentifier, compilerResult.Errors.First().ErrorType);
        }

        [Fact(DisplayName = "Records - Multiple TypeChecking")]
        public void Records_MultipleTypeChecking() {

            /*
             * Typechecking multiple times should only result in the 
             * single error this code will produce.
             */

            var code = @"
record person =
    name: String;
";
            var compilerResult = new Compiler.Compiler(code).Compile().Check().Check();

            Assert.Single(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.Equal(ErrorKind.InvalidIdentifier, compilerResult.Errors.First().ErrorType);
        }

        [Fact(DisplayName = "Records - Two types names only")]
        public void Records_TwoTypesNamesOnly() {
            var code = @"
record Person
record Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);

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
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);

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
            var compilerResult = compiler.Compile().Check();

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
            var compilerResult = compiler.Compile().Check();

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
            var compilerResult = compiler.Compile().Check();

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
            var compilerResult = compiler.Compile().Check();

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
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.ErrorSink.Errors);
        }

        [Fact(DisplayName = "Record - Qualified Field Types 001")]
        public void Record_QualifiedFieldType_001() {
            var code = @"
record Person =
    FirstName: Address.Street;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Single(compilerResult.ErrorSink.Errors);
        }

        [Fact(DisplayName = "Record - Qualified Field Types 002")]
        public void Record_QualifiedFieldType_002() {
            var code = @"
type FirstName = String;
record Person =
    FirstName: Names.FirstName;
";
            var cache = new CompilationCache(new ErrorSink());
            var compiler = new Compiler.Compiler(code, "Names", cache);
            var compilerResult = compiler.Compile().Check();

            cache.TypeCheck();

            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(cache.Errors);
        }

        [Fact(DisplayName = "Record - Reverse Definitions")]
        public void Record_ReverseDefinitions() {
            var code = @"
record Person =
    FirstName: FirstName;
type FirstName = String;
";
            var cache = new CompilationCache(new ErrorSink());
            var compiler = new Compiler.Compiler(code, "Names", cache);
            var compilerResult = compiler.Compile().Check();

            cache.TypeCheck();

            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(cache.Errors);
        }

        [Fact(DisplayName = "Record - Qualified Field Types 003")]
        public void Record_QualifiedFieldType_003() {
            var errorSink = new ErrorSink();
            var cache = new CompilationCache(errorSink);

            new Compiler.Compiler("record Address;", "Address", cache).Compile().Check();
            new Compiler.Compiler("type FirstName = String;", "Names", cache).Compile().Check();
            var code = @"
open Names;
record Person =
    FirstName: Names.FirstName;
";
            new Compiler.Compiler(code, "Person", cache).Compile().Check();
            var compilerResult = cache.Get("Person");

            cache.TypeCheck();

            Assert.Equal(3, cache.Count());
            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(errorSink.Errors);
        }

        [Fact(DisplayName = "Record - Qualified Field Add Twice")]
        public void Record_QualifiedFieldAddTwice() {
            var errorSink = new ErrorSink();
            var cache = new CompilationCache(errorSink);

            new Compiler.Compiler("record Address;", "Address", cache).Compile().Check();
            new Compiler.Compiler("type FirstName = String;", "Names", cache).Compile().Check();
            var code = @"
open Names;
record Person =
    FirstName: Names.FirstName;
    InvoiceAddress: Address.Address;
    DeliveryAddress: Address.Address;
";
            new Compiler.Compiler(code, "Person", cache).Compile().Check();
            var compilerResult = cache.Get("Person");

            cache.TypeCheck();

            Assert.Equal(3, cache.Count());
            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(errorSink.Errors);
        }

        [Fact(DisplayName = "ERROR - Record - Qualified Field Types 004")]
        public void ERROR_Record_QualifiedFieldType_004() {
            var code = @"
record Person =
    Address: Address.Address;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Single(compilerResult.ErrorSink.Errors);
        }

        [Fact(DisplayName = "ERROR - Record - No Identifier")]
        public void ERROR_Record_NoIdentifier() {
            var code = @"
record =
    Address: Address.Address;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Ast);
            Assert.Single(compilerResult.ErrorSink.Errors);
        }

        [Fact(DisplayName = "ERROR - Record - No Identifier 002")]
        public void ERROR_Record_NoIdentifier_002() {
            var code = @"
record =
    Address: Address;

record Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Single(compilerResult.ErrorSink.Errors);
        }

        [Fact(DisplayName = "Record - Extended Fields")]
        public void Record_ExtendedFields() {
            var code = @"
record Person =
    FirstName: String;
    LastName: String;
record Address =
    Street: String;
record PeterPan extends Person Address =
    Age: Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(3, compilerResult.Ast.Count);
            Assert.Equal(3, compilerResult.Lexicon.Count);
            Assert.Empty(compilerResult.ErrorSink.Errors);

            var peterPan = compilerResult.Lexicon["PeterPan"] as RecordNode;
            Assert.Equal(4, peterPan?.Fields.Count);
        }

        [Fact(DisplayName = "Record - Field Directives 001")]
        public void Record_FieldDirectives001() {
            var code = @"
record Person =
    % direction: left
    Address: Address;

record Address;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(compilerResult.ErrorSink.Errors);

            Assert.IsType<RecordNode>(compilerResult.Ast[0]);
            var personNode = (RecordNode)compilerResult.Ast[0];

            Assert.Single(personNode.Fields[0].Directives);
            Assert.IsType<DirectiveNode>(personNode.Fields[0].Directives[0]);
            DirectiveNode directive = (DirectiveNode)personNode.Fields[0].Directives[0];
            Assert.Equal("direction", directive.Id);
            Assert.Equal("left", directive.Literal);
        }


        [Fact(DisplayName = "Record - Field Directives 002")]
        public void Record_FieldDirectives002() {
            var code = @"
record Person =
    
    @ The description of the field
    @ on multiple lines...
    % direction: left
    % render: false
    Address: Address;

record Address;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(compilerResult.ErrorSink.Errors);

            Assert.IsType<RecordNode>(compilerResult.Ast[0]);
            var personNode = (RecordNode)compilerResult.Ast[0];


            Assert.Equal(2, personNode.Fields[0].Directives.Count);
            Assert.Equal("The description of the field on multiple lines...", personNode.Fields[0].Description);
            Assert.IsType<DirectiveNode>(personNode.Fields[0].Directives[0]);
            DirectiveNode directive = (DirectiveNode)personNode.Fields[0].Directives[0];
            Assert.Equal("direction", directive.Id);
            Assert.Equal("left", directive.Literal);
        }

        [Fact(DisplayName = "Record - Field Directives alt. Annotations")]
        public void Record_FieldDirectivesAltAnnotations() {
            var code = @"
record Person =
    
    @ The description of the field
    % direction: left
    @ on multiple lines...
    % render: false
    Address: Address;

record Address;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(compilerResult.ErrorSink.Errors);

            Assert.IsType<RecordNode>(compilerResult.Ast[0]);
            var personNode = (RecordNode)compilerResult.Ast[0];


            Assert.Equal(2, personNode.Fields[0].Directives.Count);
            Assert.Equal("The description of the field on multiple lines...", personNode.Fields[0].Description);
            Assert.IsType<DirectiveNode>(personNode.Fields[0].Directives[0]);
            DirectiveNode directive = (DirectiveNode)personNode.Fields[0].Directives[0];
            Assert.Equal("direction", directive.Id);
            Assert.Equal("left", directive.Literal);
        }


        [Fact(DisplayName = "Parser - Larger Example 001")]
        public void Parser_LargerExample001() {
            var code = @"


# This is the title

And here we have a paragraph. The paragraph is something which we can use to create a very readable document and actually write our documentation about the offer.

record Offer 'a =
    Name: 'a;
    WoonAdres: Adres;

record Adres =
    Straat: Name;
    Huisnummer: Number;
    HuisnummerExtensie: Maybe Number;
    Validate: ValidateAddress;

type Name = String;

type ValidateAddress = Adres -> Boolean;

data Other 'a =
    | Something 'a
    | Nothing
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);

        }



        [Fact(DisplayName = "Parser - Spaces in wrong place")]
        public void Parser_SpacesInWrongPlace() {
            var code = @"


This is a Module, here you can describe your Logical Data Models
and collaborate on the actual functionality.

type Address = String;
    
@Example logical type
record Person =
    FirstName: Name;
    MiddleName: Name;
    LastName: Name;
    Prefixes: String;
    @ van, de, etc tussenvoegsel
    Insertion: String;
    Salutation: String;
    Title: String;
    DateOfBirth: Date;
    Gender: Gender;
    
type Name = String
    & min 2
    & max 50;
    
choice Gender =
    | ""Male""
    | ""Female""
    | ""Non-binary""
    
record ContactInformation extends Person CommunicationInformation =
    @ Function in the company
    Function: Maybe String;
    SIZOKey: Maybe String;

record CommunicationInformation extends Address =
    Email: Email;
    Phone: Phone;
    PhoneWork: Phone;
    PhoneMobile: Phone;
    PreferredLanguage: Maybe String;

type Email = String
type Phone = String
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(9, compilerResult.Ast.Count);
            Assert.Empty(compilerResult.Errors);
            
        }





    }
}
