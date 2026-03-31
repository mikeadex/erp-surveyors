# Module L — Document Management

## Web

1. Open `/documents`.
2. Click `Upload Document`.
3. Choose a PDF, Word, Excel, JPEG, or PNG file under 50MB.
4. Link it to at least one record:
   - a case, or
   - a client, or
   - a property.
5. Complete the upload and confirm the new record appears in the register.
6. Verify the record shows the linked case, client, property, category, and tags.
7. Download the uploaded file from the list.
8. Call `GET /api/v1/documents/[id]` and confirm the metadata matches the UI.
9. Call `PATCH /api/v1/documents/[id]` to update name, category, tags, or linkage.
10. Call `DELETE /api/v1/documents/[id]` and confirm it disappears from the list without hard-deleting the row.

## Validation

1. Try uploading a file larger than 50MB and confirm the upload is blocked.
2. Try uploading an unsupported MIME type and confirm the API returns validation feedback.
3. Try creating a document without a case, client, or property link and confirm it is rejected.
4. If a case is selected with a mismatched client or property, confirm the API blocks the request.

## Branch Scope

1. Sign in as a branch-scoped user and confirm documents linked to another branch's case or client do not appear.
2. Sign in as a managing partner and confirm the full document register is visible.

## Mobile

1. Open a case in the mobile app.
2. In the `Documents` section, tap `Upload`.
3. Pick a supported file and complete the upload.
4. Confirm the uploaded document appears in the case document list with category/tag metadata.
5. Tap `Open` and confirm the signed document URL opens successfully.
6. Tap `Remove` and confirm the document disappears from the case after deletion.
