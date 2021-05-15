//using System;
//using System.Collections.Generic;
//using Compiler.Language.Nodes;
//using Compiler.Symbols;
//using Newtonsoft.Json;
//using Newtonsoft.Json.Linq;

//namespace CLI
//{

//    public static class Logger
//    {


//        public static string Log(AstNode node)
//        {
//            var settings = new JsonSerializerSettings { Formatting = Formatting.Indented };
//            settings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
//            settings.TypeNameHandling = TypeNameHandling.Objects;
//            string s = JsonConvert.SerializeObject(node, settings);
//            Console.WriteLine(s);
//            return s;
//        }

//        public static void Resolve(string s) {
//            var settings = new JsonSerializerSettings {
//                TypeNameHandling = TypeNameHandling.Objects
//            };
//            settings.Converters.Add(new RecordConverter());
//            settings.Converters.Add(new AnnotationConverter());
//            settings.Converters.Add(new TokenConverter());
//            var result = JsonConvert.DeserializeObject<AstNode>(s, settings);
//        }

//    }

//    public class RecordConverter : JsonConverter {
//        public override bool CanConvert(Type objectType) {
//            return (objectType == typeof(RecordNode));
//        }

//        public override object? ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
//            // Load the JSON for the Result into a JObject
//            JObject jo = JObject.Load(reader);

//            // Return the result
//            return null;
//        }

//        public override bool CanWrite {
//            get { return false; }
//        }

//        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
//            throw new NotImplementedException();
//        }
//    }

//    public class AnnotationConverter : JsonConverter {
//        public override bool CanConvert(Type objectType) {
//            return (objectType == typeof(AnnotationNode));
//        }

//        public override object? ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
//            // Load the JSON for the Result into a JObject
//            JObject jo = JObject.Load(reader);
//            var token = jo["Token"]?.ToObject<Token>();
//            return token is null ? token : new AnnotationNode(token);
//        }

//        public override bool CanWrite {
//            get { return false; }
//        }

//        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
//            throw new NotImplementedException();
//        }
//    }

//    public class TokenConverter : JsonConverter {
//        public override bool CanConvert(Type objectType) {
//            return (objectType == typeof(Token));
//        }

//        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
//            // Load the JSON for the Result into a JObject
//            JObject jo = JObject.Load(reader);
//            var columnStart = (int)jo["ColumnStart"];
//            var columnEnd = jo["ColumnEnd"] ?? 0;
//            //var token = jo["Token"].ToObject<Token>();
//            return new Token();
//        }

//        public override bool CanWrite {
//            get { return false; }
//        }

//        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
//            throw new NotImplementedException();
//        }
//    }

//}

////namespace Compiler.Language.Nodes {
////    public partial class AnnotationNode {
////        [JsonConstructor]
////        public AnnotationNode(ISourceSegment segment, ExpressionKind expressionKind, Token token, string annotation) : base(segment, expressionKind) {
////            this.Token = token;
////            this.Annotation = annotation;
////        }
////    }
////}