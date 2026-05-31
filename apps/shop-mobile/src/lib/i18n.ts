import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      appName: 'Mela',
      'auth.welcome': 'Welcome to Mela',
      'auth.phone': 'Phone number',
      'auth.continue': 'Continue',
      'auth.otp': 'Enter the code we sent you',
      'auth.verify': 'Verify',
      'tabs.home': 'Shop',
      'tabs.orders': 'Orders',
      'tabs.wallet': 'Wallet',
      'tabs.profile': 'Profile',
      'cart.title': 'Cart',
      'cart.checkout': 'Place order',
      'common.retry': 'Retry',
      'common.offline': 'You are offline — changes will sync when reconnected',
    },
  },
  am: {
    translation: {
      appName: 'መላ',
      'auth.welcome': 'ወደ መላ እንኳን ደህና መጡ',
      'auth.phone': 'ስልክ ቁጥር',
      'auth.continue': 'ቀጥል',
      'auth.otp': 'የተላከውን ኮድ ያስገቡ',
      'auth.verify': 'አረጋግጥ',
      'tabs.home': 'ገበያ',
      'tabs.orders': 'ትዕዛዞች',
      'tabs.wallet': 'ቦርሳ',
      'tabs.profile': 'መገለጫ',
      'cart.title': 'ጋሪ',
      'cart.checkout': 'ትዕዛዝ ስጥ',
      'common.retry': 'እንደገና ሞክር',
      'common.offline': 'ከመስመር ውጪ ነዎት — ሲገናኙ ይመሳሰላል',
    },
  },
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'am',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
