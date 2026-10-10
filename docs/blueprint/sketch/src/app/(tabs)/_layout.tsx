/**
 * Home and Profile tabs (iOS/Android only; the web tab bar is removed in Feature 0).
 * Replaces `src/components/app-tabs.tsx` — the tabs are defined where the routes live.
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>ホーム</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>プロフィール</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="pawprint" md="pets" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
