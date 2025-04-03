This guide is for your product form script on main-vm (34.59.133.38), handling product media uploads for a logged-in user, integrating with media-vm (34.60.105.144) and db-vm (10.128.0.31). Products are associated with the user as the vendor, supporting all web image/video formats, with a max of 15 media per product and batches up to 250 products.

Process for New Product Form on main-vm
Purpose: Collect up to 15 product images/videos per product from a logged-in user, store temporarily, and send to media-vm for permanent storage in /users/[userId]/products/[productId]/.

1. Form Submission
Endpoint: POST /products/add (or POST /products/batch for multiple).
Inputs:
Single Product:
Text: productName, description, etc. (your existing fields).
Files: <input type="file" name="productMedia[]" multiple accept="image/*,video/*"> (up to 15 files).
User Context: userId (e.g., 123) from session/auth.
Batch (Up to 250 Products):
Array of products: [{ productName, description, productMedia: [files] }, ...].
Via form or API (e.g., JSON payload).
Action:
Use multer to save files in /tmp/:
For each product:
Generate productId (e.g., 456) from db-vm insert or temp UUID.
Timestamp (e.g., 202503092017) for uniqueness.
Save files as:
/tmp/123_product_456_202503092017_1.[ext] (e.g., .jpg).
/tmp/123_product_456_202503092017_2.[ext] (e.g., .png).
/tmp/123_product_456_202503092017_3.[ext] (e.g., .mp4).
Up to /tmp/123_product_456_202503092017_15.[ext].
Batch: Repeat for each product (e.g., 457, 458, up to 250).
Insert draft products in db-vm:
IP: 10.128.0.31 (MySQL server).
Table: products.
Fields (per product): { id: 456, user_id: 123, name: "Sheep Wool Pillow", status: "draft", temp_paths: JSON.stringify(["/tmp/123_product_456_202503092017_1.jpg", ...]) }.
Batch: Insert 250 records if applicable.
2. Notify media-vm
IP: 34.60.105.144 (media-vm).
Commands:
Create Product Folder (per product):
POST http://34.60.105.144/create-product/123/456
Body: { volume: "products" }.
Expect: { success: true, path: "/users/123/products/456/" }.
Batch: Send 250 requests (e.g., /create-product/123/457, etc.).
Upload Media (per product):
For each temp file (up to 15):
POST http://34.60.105.144/upload/123/products/456
Payload:
File: /tmp/123_product_456_202503092017_1.jpg.
Metadata: { title: "Sheep Wool Pillow 1", creator: "janedoe", userkey: "123", category: "Product Image" }.
media-vm:
Names as prod_1.jpg, prod_2.png, prod_3.mp4, etc.
Returns: { success: true, fileId: "prod_1", url: "http://media.onlineartfestival.com/users/123/products/456/prod_1.jpg" }.
Batch: Repeat for each product’s media (up to 3750 requests total).
Batch Note: With 3750 potential files, queueing happens on media-vm (max processing rate TBD). main-vm sends all requests; media-vm processes in order received.
3. Update Database and Cleanup
Action:
Update products in db-vm (per product):
SET product_urls = JSON.stringify(["http://.../prod_1.jpg", "http://.../prod_2.png", ...]), temp_paths = NULL, status = "active" WHERE id = 456.
Batch: Update 250 records.
Delete temp files:
rm /tmp/123_product_456_202503092017_* (per product).
Batch: Delete up to 3750 files.
Output:
Single: Redirect to product page (e.g., GET /products/456).
Batch: Return success message or redirect to product list.
Specifics Needed
IPs:
main-vm: 34.59.133.38.
media-vm: 34.60.105.144.
db-vm: 10.128.0.31.
Database Tables:
products: { id, user_id, name, status, temp_paths (JSON), product_urls (JSON) }.
Metadata:
Required: creator, userkey, category, title.
Optional: description, keywords, visionTags, etc. (AI fills later on media-vm).
File Naming:
Temp: [userId]_product_[productId]_[timestamp]_[index].[ext] (e.g., 123_product_456_202503092017_1.jpg).
Permanent: prod_[index].[ext] (e.g., prod_1.jpg) in /users/[userId]/products/[productId]/.
Formats: All web types (e.g., .jpg, .jpeg, .png, .gif, .mp4, .webm, .mov).
Limits:
15 media per product.
250 products per batch (max 3750 media items).
API Details:
POST /create-product/[userId]/[productId]: Creates /users/[userId]/products/[productId]/.
POST /upload/[userId]/products/[productId]: Uploads each file, returns URL.