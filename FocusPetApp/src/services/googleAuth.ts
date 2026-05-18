import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

let configured = false;

export function configureGoogleAuth(webClientId: string) {
  if (configured) {
    return;
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });

  configured = true;
}

export async function requestGoogleIdToken(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();

  if (!result.data?.idToken) {
    throw new Error('Google sign-in did not return an idToken');
  }

  return result.data.idToken;
}

export async function signOutGoogleIfSignedIn() {
  const signedIn = await GoogleSignin.hasPreviousSignIn();
  if (signedIn) {
    await GoogleSignin.signOut();
  }
}

export function mapGoogleError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Google login failed';
  }

  const code = (error as { code?: string }).code;
  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return 'Google sign-in cancelled';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return 'Google sign-in already in progress';
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services not available';
  }

  const message = (error as { message?: string }).message;
  return message || 'Google login failed';
}
