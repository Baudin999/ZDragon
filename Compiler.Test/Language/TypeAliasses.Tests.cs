using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Language {
    public class TypeAliasses {
        [Fact(DisplayName = "Types - variable type definition")]
        public void Types_VariableDefinition() {
            var code = @"
type name = String;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.ErrorSink.Errors);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.IsType<IdentifierNode>(typeNode.Body);
        }

        [Fact(DisplayName = "Types - incomplete type definition")]
        public void Types_IncompleteTypeDefinition() {
            var code = @"
type name
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.ErrorSink.Errors);
            Assert.Equal(ErrorType.InvalidTypeDefinition, compilerResult.ErrorSink.Errors.First().ErrorType);
        }

        [Fact(DisplayName = "Types - function definition")]
        public void Types_FunctionDefinition() {
            var code = @"
type add = Number -> Number -> Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            Assert.Equal(3, ((FunctionParameterNode)((TypeAliasNode)compilerResult.Ast.First()).Body).Nodes.Count);

            var d = (dynamic)compilerResult.Ast.First();
            Assert.Equal("Number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[0].Id);
            Assert.Equal("Number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[1].Id);
            Assert.Equal("Number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[2].Id);
        }

        [Fact(DisplayName = "Types - function definition maybe")]
        public void Types_FunctionDefinition_Maybe() {
            var code = @"
type add = Number -> Maybe Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            Assert.Equal(2, ((FunctionParameterNode)((TypeAliasNode)compilerResult.Ast.First()).Body).Nodes.Count);

            var d = (dynamic)compilerResult.Ast.First();
            Assert.Equal("Number", d.Body.Nodes[0].Id);

            TypeApplicationNode tan = (TypeApplicationNode)d.Body.Nodes[1];
            Assert.Equal(2, tan.Parameters.Count);
            Assert.Equal("Maybe", tan.Parameters[0].Value);
            Assert.Equal("Number", tan.Parameters[1].Value);
        }

        [Fact(DisplayName = "Types - function parameters")]
        public void Types_FunctionParameters() {
            var code = @"
type add = (Number -> Number -> Number) -> (Number -> String) -> (Number1 -> (Number2 -> Number3));
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(3, compilerResult.Errors.Count);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.IsType<FunctionParameterNode>(typeNode.Body);
            var body = (FunctionParameterNode)typeNode.Body;
            Assert.Equal(3, body.Nodes.Count);

            // first
            // (number -> number -> number)
            Assert.IsType<FunctionParameterNode>(body.Nodes.First());
            var first = (FunctionParameterNode)body.Nodes.First();
            Assert.Equal(3, first.Nodes.Count);
            Assert.IsType<IdentifierNode>(first.Nodes.First());
            Assert.Equal("Number", ((IdentifierNode)first.Nodes.First()).IdToken.Value);
            Assert.IsType<IdentifierNode>(first.Nodes.Last());
            Assert.Equal("Number", ((IdentifierNode)first.Nodes.Last()).IdToken.Value);


            // second
            // (Number -> String)
            Assert.IsType<FunctionParameterNode>(body.Nodes[1]);
            var second = (FunctionParameterNode)body.Nodes[1];
            Assert.Equal(2, second.Nodes.Count);
            Assert.IsType<IdentifierNode>(second.Nodes.First());
            Assert.Equal("Number", ((IdentifierNode)second.Nodes.First()).IdToken.Value);
            Assert.IsType<IdentifierNode>(second.Nodes.Last());
            Assert.Equal("String", ((IdentifierNode)second.Nodes.Last()).IdToken.Value);

            // second
            // (Number1 -> (Number2 -> Number3))
            Assert.IsType<FunctionParameterNode>(body.Nodes.First());
            var third = (FunctionParameterNode)body.Nodes.Last();
            Assert.Equal(2, third.Nodes.Count);
            Assert.IsType<IdentifierNode>(third.Nodes.First());
            Assert.Equal("Number1", ((IdentifierNode)third.Nodes.First()).IdToken.Value);

            Assert.IsType<FunctionParameterNode>(third.Nodes.Last());
            var thirdLast = (FunctionParameterNode)third.Nodes.Last();
            Assert.Equal(2, thirdLast.Nodes.Count);
            Assert.Equal("Number2", ((IdentifierNode)thirdLast.Nodes.First()).IdToken.Value);
            Assert.Equal("Number3", ((IdentifierNode)thirdLast.Nodes.Last()).IdToken.Value);
        }

        [Fact(DisplayName = "Types - generic function definition")]
        public void Types_GenericFunctionDefinition() {
            var code = @"
type add 'a 'b = 'a -> 'b -> Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);

            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.Equal("add", typeNode.IdToken.Value);
            Assert.Equal(2, typeNode.GenericParameters.Count());
            Assert.Equal("'a", typeNode.GenericParameters.First().Value);
            Assert.Equal("'b", typeNode.GenericParameters.Last().Value);

            Assert.IsType<FunctionParameterNode>(typeNode.Body);
            var nodes = ((FunctionParameterNode)typeNode.Body).Nodes.ToList();
            Assert.Equal(3, nodes.Count);

            GenericParameterNode aGN = (GenericParameterNode)nodes[0];
            GenericParameterNode bGN = (GenericParameterNode)nodes[1];
            IdentifierNode result = (IdentifierNode)nodes[2];

            Assert.NotNull(aGN);
            Assert.NotNull(bGN);
            Assert.NotNull(result);

            Assert.Equal("'a", aGN.IdToken.Value);
            Assert.Equal("'b", bGN.IdToken.Value);
            Assert.Equal("Number", result.IdToken.Value);
        }

        [Fact(DisplayName = "Types - bind")]
        public void Types_Bind() {
            var code = @"
type bindMaybe 'a 'b = Maybe 'a -> ('a -> 'b) -> Maybe 'b;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);

            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.Equal("bindMaybe", typeNode.IdToken.Value);
            Assert.Equal(2, typeNode.GenericParameters.Count());
            Assert.Equal("'a", typeNode.GenericParameters.First().Value);
            Assert.Equal("'b", typeNode.GenericParameters.Last().Value);

            Assert.IsType<FunctionParameterNode>(typeNode.Body);
            var nodes = ((FunctionParameterNode)typeNode.Body).Nodes.ToList();
            Assert.Equal(3, nodes.Count);

            Assert.IsType<TypeApplicationNode>(nodes[0]);
            TypeApplicationNode first = (TypeApplicationNode)nodes[0];
            Assert.Equal(2, first.Parameters.Count);
            Assert.Equal("Maybe", first.Parameters[0].Value);
            Assert.Equal("'a", first.Parameters[1].Value);


            Assert.IsType<FunctionParameterNode>(nodes[1]);
            FunctionParameterNode second = (FunctionParameterNode)nodes[1];
            Assert.Equal(2, second.Nodes.Count);
            Assert.Equal("'a", (second.Nodes[0] as GenericParameterNode)?.IdToken.Value);
            Assert.Equal("'b", (second.Nodes[1] as GenericParameterNode)?.IdToken.Value);

            Assert.IsType<TypeApplicationNode>(nodes[2]);
            TypeApplicationNode third = (TypeApplicationNode)nodes[2];
            Assert.Equal(2, third.Parameters.Count);
            Assert.Equal("Maybe", third.Parameters[0].Value);
            Assert.Equal("'b", third.Parameters[1].Value);
        }

        [Fact(DisplayName = "Types - generic function definition error 001")]
        public void Types_GenericFunctionDefinition_Error001() {
            var code = @"
type add 'a = 'a -> 'b -> Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Errors);
            Assert.Equal(ErrorType.GenericParameter_Undefined, compilerResult.Errors[0].ErrorType);
        }
        [Fact(DisplayName = "Types - generic function definition error 002")]
        public void Types_GenericFunctionDefinition_Error002() {
            var code = @"
type add 'a = Number -> Number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Errors);
            Assert.Equal(ErrorType.GenericParameter_Unused, compilerResult.Errors[0].ErrorType);
        }

        [Fact(DisplayName = "Types - Annotations")]
        public void Expression_Annotations() {
            var code = @"
@ The name type
@ with multi-line 
@ annotations
type name = String;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            var annotation = "The name type with multi-line annotations";
            Assert.Equal(annotation, typeNode.AnnotationNode.Annotation);
        }


        [Fact(DisplayName = "Types - With Restrictions")]
        public void Expression_WithRestrictions() {
            var code = @"
@ The name type
@ with multi-line annotations
type Name = String
    & min 1
    & max 50;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Empty(compilerResult.Errors);
            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            var annotation = "The name type with multi-line annotations";
            Assert.Equal(annotation, typeNode.AnnotationNode.Annotation);
        }


        [Fact(DisplayName = "Types - Type Application 001")]
        public void Expression_TypeApplication001() {
            var code = @"
type MaybePerson = Maybe Person;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Errors);
        }



        [Fact(DisplayName = "Types - Type Application 002")]
        public void Expression_TypeApplication002() {
            var code = @"
type PersonRequest = Request Person;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(2, compilerResult.Errors.Count);
        }


        [Fact(DisplayName = "Types - Type Application 003")]
        public void Expression_TypeApplication003() {
            var code = @"
type PersonRequest = Request Person;

record Request 'a =
    Body: 'a;

record Person =
    FirstName: String;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Empty(compilerResult.Errors);

            var item = compilerResult.Lexicon["PersonRequest"];
            Assert.IsType<RecordNode>(item);
            var personRequest = (RecordNode)item;
            Assert.Equal(ExpressionKind.RecordExpression, personRequest.ExpressionKind);
        }


    }
}
