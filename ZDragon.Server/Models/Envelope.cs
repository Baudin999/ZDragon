using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Server.Models {
    public interface IEnvelope {
        string Code { get; set; }
    }

    public class Success<T> : IEnvelope {
        public T Body { get; set; }
        public string Code { get; set; }

        public Success(T body) {
            this.Body = body;
            this.Code = "ok";
        }
    }

    public class Error : BadRequestObjectResult, IEnvelope {
        public string Message { get; }
        public string Code { get; set; }
        public Error(string message) : base(message) {
            this.Message = message;
            this.Code = "error";
        }
    }

    public class ValidationError : IEnvelope {
        public Dictionary<string, IEnumerable<string>> FieldErrors { get; private set; }
        public string Code { get; set; }

        public ValidationError(ModelStateDictionary modelState) {
            this.FieldErrors = modelState.ToDictionary(m => m.Key, m => m.Value.Errors.Select(s => s.ErrorMessage));
            this.Code = "validation_error";
        }
    }

    public class UnauthorizedError : IEnvelope {
        public string Code { get; set; }
        public UnauthorizedError() {
            this.Code = "unauthorized";
        }
    }
}
