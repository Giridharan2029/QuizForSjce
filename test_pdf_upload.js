const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function testPdfUpload() {
  console.log('🧪 Testing PDF upload endpoint...');

  const form = new FormData();
  // Create a dummy mock PDF buffer
  const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nBT (Data Structures MCQ Quiz Array Linked List Stack Queue) Tj ET\nxref\n0 2\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  
  form.append('document', mockPdfBuffer, {
    filename: 'DS_MCQ_Questions.pdf',
    contentType: 'application/pdf'
  });
  form.append('count', '5');
  form.append('types', 'mcq,true_false');

  const request = http.request({
    method: 'POST',
    host: 'localhost',
    port: 3000,
    path: '/api/ai/generate-from-file',
    headers: form.getHeaders()
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      try {
        const json = JSON.parse(body);
        console.log('Success:', json.success);
        console.log('Title:', json.title);
        console.log('Questions Generated:', json.questions?.length);
        if (json.success) {
          console.log('\n🎉 PDF GENERATION TEST PASSED 100%!');
        } else {
          console.error('Failed:', json);
        }
      } catch (e) {
        console.error('Response:', body);
      }
    });
  });

  form.pipe(request);
}

testPdfUpload();
