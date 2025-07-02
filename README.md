# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deployment

This project is configured for Firebase App Hosting.

### Automatic Deployments

To enable automatic deployments, you must connect your Firebase App Hosting backend to your GitHub repository.

1.  **Go to the Firebase Console:** Navigate to your Firebase project.
2.  **Select App Hosting:** In the left-hand menu under "Build", click on "App Hosting".
3.  **Manage Your Backend:** Find your hosting backend in the list and click "Manage".
4.  **Connect to GitHub:** In the dashboard, you will find options to connect to a GitHub repository. Follow the on-screen instructions to authorize Firebase and select the correct repository and branch (usually `main`).

Once this connection is established, any new commits pushed to your selected branch will automatically trigger a new build and deployment.

If automatic deployments stop working, you can try disconnecting and reconnecting the repository in the Firebase Console to reset the integration.
