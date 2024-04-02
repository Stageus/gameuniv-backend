makeUserItem = (userData) => {
  console.log(userData);
  const userEmail = userData.email;
  const userProfileImg = userData.profile_img || '';
  const userId = userData.id;
  const userUnivName = userData.university_name;
  const userCoin = userData.coin;
  const userIsDelete = userData.is_delete || '';
  const userBlockState = userData.block_state || '';
  const user2048GameCount = userData.game_2048_count || 0;
  const usertetrisGameCount = userData.game_tetris_count || 0;

  const emailContainer = document.createElement('div');
  emailContainer.classList.add('email_container');
  emailContainer.innerText = `${userEmail}`;

  const idContainer = document.createElement('div');
  idContainer.classList.add('id_container');
  idContainer.innerText = `${userId}`;

  const univNameContainer = document.createElement('div');
  univNameContainer.classList.add('university_name_container');
  univNameContainer.innerText = `${userUnivName}`;

  const coinContainer = document.createElement('div');
  coinContainer.classList.add('coin_container');
  coinContainer.innerText = `${userCoin}`;

  const game2048CountContainer = document.createElement('div');
  game2048CountContainer.classList.add('game_2048_game_count_container');
  game2048CountContainer.innerText = `${user2048GameCount}`;

  const gameTetrisCountContainer = document.createElement('div');
  gameTetrisCountContainer.classList.add('tetris_game_count_container');
  gameTetrisCountContainer.innerText = `${usertetrisGameCount}`;

  const isDeleteContainer = document.createElement('div');
  isDeleteContainer.classList.add('is_delete_container');
  isDeleteContainer.innerText = `${userIsDelete}`;

  const blockStateContainer = document.createElement('div');
  blockStateContainer.classList.add('block_state_container');
  blockStateContainer.innerText = `${userBlockState}`;

  const userInfoContainer = document.createElement('div');
  userInfoContainer.classList.add('user_info_container');
  userInfoContainer.append(emailContainer);
  userInfoContainer.append(idContainer);
  userInfoContainer.append(univNameContainer);
  userInfoContainer.append(coinContainer);
  userInfoContainer.append(game2048CountContainer);
  userInfoContainer.append(gameTetrisCountContainer);
  userInfoContainer.append(isDeleteContainer);
  userInfoContainer.append(blockStateContainer);

  const blockButton = document.createElement('button');
  blockButton.classList.add('block_btn');
  blockButton.addEventListener('click', blockBtnEvent);
  blockButton.innerText = '정지하기';
  blockButton.dataset.email = userEmail;

  const blockDelBtn = document.createElement('button');
  blockDelBtn.classList.add('delete_block_btn');
  blockDelBtn.dataset.email = userEmail;
  blockDelBtn.innerText = '정지해제';
  blockDelBtn.addEventListener('click', blockDelBtnEvent);

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button_container');
  buttonContainer.append(blockButton);
  buttonContainer.append(blockDelBtn);

  const profileImg = document.createElement('img');
  profileImg.src = `https://jochong.s3.ap-northeast-2.amazonaws.com/gameuniv_user_profile/${userProfileImg}`;

  const profileImgContainer = document.createElement('div');
  profileImgContainer.classList.add('profile_img_container');
  userProfileImg ? profileImgContainer.append(profileImg) : null;

  const userItem = document.createElement('div');
  userItem.classList.add('user_item');
  userItem.append(profileImgContainer);
  userItem.append(userInfoContainer);
  userItem.append(buttonContainer);

  return userItem;
};

const blockBtnEvent = async (e) => {
  const blockEmail = e.target.dataset.email;

  const confirmResult = confirm('정말 정지하시겠습니까?');

  if (confirmResult) {
    const response = await fetch('/block/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: blockEmail,
      }),
    });

    if (response.status === 200) {
      alert('정지되었습니다.');
    } else {
      alert('에러가 발생했습니다.');
    }
  }
};

const blockDelBtnEvent = async (e) => {
  const blockEmail = e.target.dataset.email;

  const confirmResult = confirm('정말 정지를 해제하시겠습니까?');

  if (confirmResult) {
    const response = await fetch(`/block/user?email=${blockEmail}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      alert('정지가 해제되었습니다.');
    } else {
      alert('에러가 발생했습니다.');
    }
  }
};
