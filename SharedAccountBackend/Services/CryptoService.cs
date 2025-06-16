using System.Security.Cryptography;
using System.Text;

namespace SharedAccountBackend.Services
{
    public class CryptoService
    {
        private readonly string _key;

        public CryptoService(IConfiguration config)
        {
            _key = config["EncryptionKey"]!;
        }

        public string Encrypt(string input)
        {
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_key);

            var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
            cs.Write(Encoding.UTF8.GetBytes(input));
            cs.FlushFinalBlock();

            return Convert.ToBase64String(ms.ToArray());
        }
    }
}
