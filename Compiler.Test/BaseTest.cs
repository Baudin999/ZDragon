using System;
using Newtonsoft.Json;
using Xunit;
using Xunit.Abstractions;

namespace Compiler.Test
{

    public abstract class BaseTest
    {
        private readonly ITestOutputHelper output;

        public void Log<T>(T t)
        {
            var settings = new JsonSerializerSettings { Formatting = Formatting.Indented };
            settings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());

            var txt = t switch
            {
                String s => s,
                _ => JsonConvert.SerializeObject(t, settings)
            };
            output.WriteLine(txt);

        }

        public BaseTest(ITestOutputHelper output)
        {
            this.output = output;
        }

    }
}