import { useState } from "react";
import { Modal, Platform, View, StyleSheet } from "react-native";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useOverlayRegistration } from "@/src/stores/overlay-count-store";

interface AvatarCropModalProps {
  imageUri: string;
  onCancel: () => void;
  onCrop: (croppedArea: Area) => void;
  visible: boolean;
}

export function AvatarCropModal({ imageUri, onCancel, onCrop, visible }: AvatarCropModalProps) {
  const { t } = useTranslation("settings");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const reduceMotionEnabled = useReduceMotionEnabled();
  // Overlay-count registry (#1473, spec §2 on #1142); the guard test derives
  // every raw-Modal renderer, so this line is not optional.
  useOverlayRegistration(visible);

  const onCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleConfirm = () => {
    if (croppedAreaPixels) {
      onCrop(croppedAreaPixels);
    }
  };

  // ⚠️ WEB: a closed modal unmounts outright instead of lingering for its
  // 250ms fade-out, during which react-native-web's Modal is a non-inert
  // focus trap (#1034; swept in #1054 — the full story lives on
  // ConfirmDialog's gate). The Platform check is tautological in a .web file
  // but keeps the gate in the same grep-able shape as the rest of the sweep.
  if (!visible && Platform.OS === "web") return null;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text className="text-lg font-semibold text-foreground">{t("avatarCrop.title")}</Text>
          </View>
          <View style={styles.cropContainer}>
            <Cropper
              aspect={1}
              crop={crop}
              cropShape="round"
              image={imageUri}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              zoom={zoom}
            />
          </View>
          <View style={styles.footer}>
            <Button onPress={onCancel} variant="ghost">
              <Text>{t("avatarCrop.cancel")}</Text>
            </Button>
            <Button onPress={handleConfirm}>
              <Text>{t("avatarCrop.apply")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "hsl(var(--background))",
    borderRadius: 12,
    height: "80%",
    maxHeight: 600,
    maxWidth: 500,
    overflow: "hidden",
    width: "90%",
  },
  cropContainer: {
    flex: 1,
    position: "relative",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    padding: 16,
  },
  header: {
    alignItems: "center",
    padding: 16,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flex: 1,
    justifyContent: "center",
  },
});
