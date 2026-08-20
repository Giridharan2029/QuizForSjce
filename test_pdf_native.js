async function testNativeUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const mockPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nBT (Data Structures Array Linked List Tree Graph) Tj ET\nxref\n0 2\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  const postData = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="DS_MCQ_Questions.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    mockPdf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="count"\r\n\r\n10\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="types"\r\n\r\nmcq,true_false,word_cloud\r\n`),
    Buffer.from(`--${boundary}--\r\n`)
  ]);

  console.log('📡 Sending PDF upload request to http://localhost:3000/api/ai/generate-from-file...');

  const res = await fetch('http://localhost:3000/api/ai/generate-from-file', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: postData
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response Success:', data.success);
  console.log('Quiz Title:', data.title);
  console.log('Questions count:', data.questions?.length);
  if (data.success && data.questions?.length > 0) {
    console.log('\n🎉 PDF QUESTION GENERATION VERIFIED 100% WORKING!\n');
  } else {
    console.error('Error:', data);
    process.exit(1);
  }
}

testNativeUpload();
