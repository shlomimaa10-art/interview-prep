Deploy the InterviewApp to the Azure Static Web App.

Run these exact steps in order:

1. Copy files to a clean temp folder:
```
mkdir -p /tmp/swa-clean
cp ~/Desktop/InterviewApp/index.html /tmp/swa-clean/index.html
cp ~/Desktop/InterviewApp/sitemap.xml /tmp/swa-clean/sitemap.xml
cp ~/Desktop/InterviewApp/googlec705fb3dc14fbead.html /tmp/swa-clean/googlec705fb3dc14fbead.html
echo '{"navigationFallback":{"rewrite":"/index.html"}}' > /tmp/swa-clean/staticwebapp.config.json
```

2. Fetch the deploy token and deploy:
```
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "interview-prep-web" \
  --resource-group "interview-prep-app" \
  --query "properties.apiKey" -o tsv) && \
swa deploy /tmp/swa-clean \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production \
  --app-location "/" \
  --swa-config-location "/tmp/swa-clean"
```

3. Run the docs agent:
After a successful deploy, invoke the **@docs-update** agent with:
> "trigger: deploy"

Let it audit and patch the docs, then report its summary to the user.

4. Report to the user:
- Live URL: https://zealous-pond-0e6b2f103.2.azurestaticapps.net
- Docs update summary (from @docs-update)
