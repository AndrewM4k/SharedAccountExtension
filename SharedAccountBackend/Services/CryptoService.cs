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

            // Генерируем IV и сохраняем его вместе с данными
            aes.GenerateIV();
            byte[] iv = aes.IV;

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            // Записываем IV в начало выходных данных
            ms.Write(iv, 0, iv.Length);
            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            {
                cs.Write(Encoding.UTF8.GetBytes(input));
            }

            return Convert.ToBase64String(ms.ToArray());
        }

        public string Decrypt(string encryptedInput)
        {
            byte[] fullCipher = Convert.FromBase64String(encryptedInput);

            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_key);

            // Извлекаем IV из начала зашифрованных данных
            byte[] iv = new byte[aes.IV.Length];
            Array.Copy(fullCipher, iv, iv.Length);
            aes.IV = iv;

            // Создаем decryptor и расшифровываем данные
            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream();
            using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Write))
            {
                // Записываем данные без IV (после первых 16 байт)
                cs.Write(fullCipher, iv.Length, fullCipher.Length - iv.Length);
            }

            return Encoding.UTF8.GetString(ms.ToArray());
        }
    
    }
}
