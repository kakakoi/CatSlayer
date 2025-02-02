// faviconを生成するキャンバスを作成
const canvas = document.createElement('canvas');
const sizes = [16, 32, 192, 512];

sizes.forEach(size => {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 背景を透明に
    ctx.clearRect(0, 0, size, size);
    
    // 体の基本色（黄色）
    ctx.fillStyle = '#FFA500'; // オレンジがかった黄色
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 * 0.9, 0, Math.PI * 2);
    ctx.fill();
    
    // トラ模様（縦縞）
    ctx.fillStyle = 'rgba(139, 69, 19, 0.5)'; // 茶色の縞模様
    const stripeWidth = size * 0.12;
    ctx.fillRect(size * 0.3, 0, stripeWidth, size);
    ctx.fillRect(size * 0.5, 0, stripeWidth, size);
    ctx.fillRect(size * 0.7, 0, stripeWidth, size);
    
    // 耳
    ctx.fillStyle = '#FFA500';
    // 左耳
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.3);
    ctx.lineTo(size * 0.3, size * 0.1);
    ctx.lineTo(size * 0.4, size * 0.3);
    ctx.fill();
    // 右耳
    ctx.beginPath();
    ctx.moveTo(size * 0.6, size * 0.3);
    ctx.lineTo(size * 0.7, size * 0.1);
    ctx.lineTo(size * 0.8, size * 0.3);
    ctx.fill();
    
    // 耳の内側
    ctx.fillStyle = '#FFE4B5'; // モカ色
    // 左耳
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.28);
    ctx.lineTo(size * 0.3, size * 0.15);
    ctx.lineTo(size * 0.35, size * 0.28);
    ctx.fill();
    // 右耳
    ctx.beginPath();
    ctx.moveTo(size * 0.65, size * 0.28);
    ctx.lineTo(size * 0.7, size * 0.15);
    ctx.lineTo(size * 0.75, size * 0.28);
    ctx.fill();
    
    // 目
    ctx.fillStyle = '#FFD700'; // 黄色い目
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.45, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.65, size * 0.45, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
    // 瞳（細い縦長の黒目）
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.ellipse(size * 0.35, size * 0.45, size * 0.03, size * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.65, size * 0.45, size * 0.03, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ファイルとして保存
    const fileName = size === 16 ? 'favicon-16x16.png' :
                    size === 32 ? 'favicon-32x32.png' :
                    size === 192 ? 'android-chrome-192x192.png' :
                    'android-chrome-512x512.png';
    
    // canvasをPNG形式でエクスポート
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// .icoファイル用（16x16）
canvas.width = 16;
canvas.height = 16;
// ... 同じ描画処理 ...
// .icoファイルとして保存（この部分は実際にはサーバーサイドでの処理が必要） 