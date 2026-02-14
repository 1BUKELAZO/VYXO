
import { NativeTabs, Icon, Label, Badge } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Home</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="../discover">
        <Label>Discover</Label>
        <Icon sf="safari" drawable="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="../create">
        <Label></Label>
        <Icon sf="plus" drawable="add" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Label>Inbox</Label>
        <Badge>3</Badge>
        <Icon sf={{ default: 'bell', selected: 'bell.fill' }} drawable="notifications" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf={{ default: 'person', selected: 'person.fill' }} drawable="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
