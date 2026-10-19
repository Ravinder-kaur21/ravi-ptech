# Google OAuth fix checklist

- [ ] Confirm the Google OAuth provider is configured in the auth server
- [ ] Trace the signup/login social signin flow and find the failing condition
- [ ] Fix the app to handle missing/invalid OAuth env config cleanly
- [ ] Ensure the Google button works in local dev or configured environment
- [ ] Verify the login/signup page loads and the Google flow no longer fails silently
