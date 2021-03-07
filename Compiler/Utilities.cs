using System;
using System.Collections.Generic;
using System.Text;

namespace Compiler {
    public static class Utilities {
        public static byte[] StringToByteArray(string s) {
            return ASCIIEncoding.ASCII.GetBytes(s);
        }

        public static string ByteArrayToString(byte[] arrInput) {
            int i;
            StringBuilder sOutput = new StringBuilder(arrInput.Length);
            for (i = 0; i < arrInput.Length - 1; i++) {
                sOutput.Append(arrInput[i].ToString("X2"));
            }
            return sOutput.ToString();
        }

        public static bool HashCompare(byte[] h1, byte[] h2) {
            bool bEqual = false;
            if (h2.Length == h1.Length) {
                int i = 0;
                while ((i < h2.Length) && (h2[i] == h1[i])) {
                    i += 1;
                }
                if (i == h2.Length) {
                    bEqual = true;
                }
            }
            return bEqual;
        }

        public static byte[] HashString(string s) {
            var sha256 = System.Security.Cryptography.SHA256.Create();
            return sha256.ComputeHash(StringToByteArray(s));
        }

        public static string WordWrap(string text, int maxLineLength) {
            var list = new List<string>();

            int currentIndex;
            var lastWrap = 0;
            var whitespace = new[] { ' ', '\r', '\n', '\t' };
            do {
                currentIndex = lastWrap + maxLineLength > text.Length ? text.Length : (text.LastIndexOfAny(new[] { ' ', ',', '.', '?', '!', ':', ';', '-', '\n', '\r', '\t' }, Math.Min(text.Length - 1, lastWrap + maxLineLength)) + 1);
                if (currentIndex <= lastWrap)
                    currentIndex = Math.Min(lastWrap + maxLineLength, text.Length);
                list.Add(text.Substring(lastWrap, currentIndex - lastWrap).Trim(whitespace));
                lastWrap = currentIndex;
            } while (currentIndex < text.Length);

            return string.Join("\\n",list);
        }
    }
}
