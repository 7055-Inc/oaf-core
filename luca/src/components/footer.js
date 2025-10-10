/**
 * Footer Component for Luca Platform
 * Reusable footer that can be merged into main app later
 */

function createFooter() {
  return `
    <footer class="footer">
        <div class="footer-container">
            <p>&copy; ${new Date().getFullYear()} Luca - Product Costing Platform. All rights reserved.</p>
        </div>
    </footer>
  `;
}

module.exports = { createFooter };
