using System;
using System.Threading.Tasks;

namespace PlantUmlCk
{
    public interface IPlantUmlRenderer
    {
        Task<byte[]> RenderAsync(string code, OutputFormat outputFormat);

        byte[] Render(string code, OutputFormat outputFormat);

        Uri RenderAsUri(string code, OutputFormat outputFormat);
    }
}