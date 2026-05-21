import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';

export default function QRCodeGenerator2() {
  const [url, setUrl] = useState<string>('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [qrName, setQrName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const generateQR = (): void => {
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
    setQrData(qrUrl);
  };

  const downloadPNG = (): void => {
    if (!qrData) return;
    
    const link = document.createElement('a');
    link.href = qrData;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSVG = (): void => {
    if (!qrData) return;
    
    const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&data=${encodeURIComponent(url)}`;
    
    fetch(svgUrl)
      .then(response => response.text())
      .then(svgContent => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'qrcode.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      });
  };

  const handleSaveClick = (): void => {
    setShowSaveDialog(true);
    setQrName('');
  };

  const saveToSupabase = async (): Promise<void> => {
    if (!qrName.trim()) {
      alert('Please enter a name for this QR code');
      return;
    }

    setSaving(true);

    try {
      // Fetch the SVG data
      const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&data=${encodeURIComponent(url)}`;
      const response = await fetch(svgUrl);
      const svgContent = await response.text();

      // Create Supabase client and insert data
      const supabase = createClient();
      const { data, error } = await supabase
        .from('qr-codes')
        .insert([
          {
            'qr-name': qrName,
            'qr-link': url,
            'qr-svg-data': svgContent
          }
        ]);

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        throw error;
      }

      console.log('Successfully saved:', data);

      alert('QR code saved successfully!');
      setShowSaveDialog(false);
      setQrName('');
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      alert('Failed to save QR code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-start-start flex-column full-width" >
      <div className='flex-center-spacebetween full-width basic-padding-top-bottom'>
        <div className="full-width flex-start-start flex-column">
          <label>Enter URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={{minWidth: '50%'}}
            onKeyPress={(e) => e.key === 'Enter' && generateQR()}
          />
        </div>
        <button onClick={generateQR} style={{marginTop: '25px'}}> Generate QR Code </button>
      </div>
      {qrData && (
        <div className='basic-padding-top-bottom'>
          <img src={qrData} alt="QR Code" style={{ width: '256px', height: '256px', border: '2px solid #ccc' }} />
          <div >
            <button className="system-button" onClick={downloadPNG} > Download PNG </button>
            <button className="system-button" onClick={downloadSVG} > Download SVG </button>
            <button className='action-button' onClick={handleSaveClick} > Save to Database </button>
          </div>

          {showSaveDialog && (
            <div style={{ 
              border: '2px solid #4CAF50', 
              padding: '20px', 
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              marginTop: '20px'
            }}>
              <h3 style={{ marginTop: 0 }}>Save QR Code</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Name:</label>
                <input
                  type="text"
                  value={qrName}
                  onChange={(e) => setQrName(e.target.value)}
                  placeholder="My QR Code"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && saveToSupabase()}
                />
              </div>
              <div>
                <button
                  onClick={saveToSupabase}
                  disabled={saving}
                  style={{ 
                    padding: '10px 20px', 
                    marginRight: '10px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  disabled={saving}
                  style={{ 
                    padding: '10px 20px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}