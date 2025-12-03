@echo off
cd /d "D:\AI_Projects\pizza"
git add .
git commit -m "Fix TypeScript errors and improve admin dashboard contact display"
git push origin main
echo.
echo Deployment complete! Check Vercel in 2-3 minutes.
pause