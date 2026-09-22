/* Anh tren GitHub Pages doi khi 404 ngay sau luc deploy vi CDN chua lan kip,
 * va trinh duyet nho luon lan hong do. Thu lai toi da 2 lan voi tham so pha cache. */

document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;

  const tried = Number(img.dataset.retry || 0);
  if (tried >= 2) return;

  img.dataset.retry = String(tried + 1);
  const base = img.src.split('?')[0];
  // cho CDN vai giay roi thu lai
  setTimeout(() => { img.src = `${base}?r=${tried + 1}`; }, 800 * (tried + 1));
}, true); // capture: su kien error cua <img> khong noi bot len
