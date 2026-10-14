// Giữ trạng thái điều hướng thống nhất trên tất cả các trang.
document.querySelectorAll('.site-nav a').forEach((link) => {
  const pagePath = (path) => path.replace(/\/index\.html$/, '/');
  const isCurrentPage = pagePath(new URL(link.href).pathname) === pagePath(window.location.pathname);
  if (isCurrentPage) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});
