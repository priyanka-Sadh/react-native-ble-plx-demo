import { Toast } from 'native-base';

function showToast(message) {
  return (
    Toast.show({
      text: message,
      buttonText: 'Okay',
      duration: 5000,
      type: 'danger'
    })
  );
}

export default {
  showToast
};