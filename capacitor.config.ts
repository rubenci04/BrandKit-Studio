import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.brandkit.studio',
  appName: 'BrandKit Studio',
  webDir: 'dist',
  android: { allowMixedContent: false },
  server: { androidScheme: 'https' },
}

export default config
