import type { Area } from "react-easy-crop";

interface AvatarCropModalProps {
  imageUri: string;
  onCancel: () => void;
  onCrop: (croppedArea: Area) => void;
  visible: boolean;
}

// Native stub. The interactive cropper (react-easy-crop) is a DOM-only library and is only
// ever rendered on web — settings-screen gates it behind `Platform.OS === "web"`, and native
// avatar editing uses expo-image-picker's built-in cropping (allowsEditing). Metro resolves
// avatar-crop-modal.web.tsx on web and this file on native, keeping react-easy-crop (and its
// transitive DOM code) out of the native JS bundle. The `Area` import is type-only (erased),
// so it adds no runtime dependency.
export function AvatarCropModal(_props: AvatarCropModalProps): null {
  return null;
}
