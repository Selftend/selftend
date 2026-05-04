import { useState, useCallback } from "react";
import { Modal, View, StyleSheet } from "react-native";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface AvatarCropModalProps {
  imageUri: string;
  onCancel: () => void;
  onCrop: (croppedArea: Area) => void;
  visible: boolean;
}

export function AvatarCropModal({ imageUri, onCancel, onCrop, visible }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = () => {
    if (croppedAreaPixels) {
      onCrop(croppedAreaPixels);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text className="text-lg font-semibold text-foreground">Crop profile picture</Text>
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
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleConfirm}>
              <Text>Apply</Text>
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
