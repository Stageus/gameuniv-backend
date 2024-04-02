let offset = 0;

window.onload = async () => {
  const response = await fetch(`/admin/user/all?offset=${offset}`);

  if (response.status === 200) {
    const result = await response.json();

    addUserItem(result);
  }
};

const addUserItem = async () => {
  const response = await fetch(`/admin/user/all?offset=${offset}`);

  if (response.status === 200) {
    const result = await response.json();

    if (result.data.length === 0) {
      alert('다음 데이터가 없습니다.');
    } else {
      document.querySelector('.user_container').innerHTML = '';

      result.data.forEach((userData) => {
        const userItem = makeUserItem(userData);

        document.querySelector('.user_container').append(userItem);
      });
    }
  }
};

const nextBtnEvent = () => {
  offset += 1;

  addUserItem();
};
