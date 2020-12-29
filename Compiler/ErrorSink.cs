using System;
using System.Collections.Generic;
using System.Text;

namespace Compiler {
    public class ErrorSink {
        public List<Error> Errors { get; private set; } = new List<Error>();

        public ErrorSink() {
            //
        }

        public void AddError(Error error) {
            this.Errors.Add(error);
        }

        public void Reset() {
            Errors = new List<Error>();
        }
    }
}
