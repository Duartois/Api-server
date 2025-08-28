import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = "sa-east-1";
const bucketName = "site-fullstack";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

export async function generateURL(fileType) {
  console.log('Tipo de arquivo recebido:', fileType);
  let date = new Date();
  const imageName = `${date.getTime()}.${fileType.split("/")[1]}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: imageName,
    ContentType: fileType
  });

  try {
    const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    console.log('URL de upload gerada:', uploadURL);
    return uploadURL;
  } catch (err) {
    console.error('Erro ao gerar URL de upload:', err);
    throw new Error('Erro ao gerar URL de upload');
  }
}
