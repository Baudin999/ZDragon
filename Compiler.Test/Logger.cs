using System;
using Newtonsoft.Json;

namespace Compiler.Test
{

    public static class Logger
    {


        public static void Log<T>(T t)
        {
            var settings = new JsonSerializerSettings { Formatting = Formatting.Indented };
            settings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
            Console.WriteLine(JsonConvert.SerializeObject(t, settings));
        }

    }

}