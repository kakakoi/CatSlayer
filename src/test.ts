// フォーマットエラー（インデントが不揃い）
function testFunction(x: unknown): void {
    console.log(x);
    const unused = 'unused variable';  // リントエラー（未使用変数）
    const num: number = 123;  // 型エラー修正
}

// 追加のフォーマットエラー
const test2 = (y: string) => {
    return `${y}test`;
}; 