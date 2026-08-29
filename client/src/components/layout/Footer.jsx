function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p>&copy; {currentYear} Personal Finance Tracker. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
