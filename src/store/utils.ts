import store from './store'

import * as constants from 'reducers/constants'

export const showLoading = () => {
  store.dispatch({ type: constants.SHOW_LOADING })
}

export const hideLoading = () => {
  store.dispatch({ type: constants.HIDE_LOADING })
}

export const showToast = (payload: string) => {
  store.dispatch({ type: constants.SHOW_TOAST, payload })
}

export const hideToast = () => {
  store.dispatch({ type: constants.HIDE_TOAST })
}

export const showMenu = (event: Event, id?: string) => {
  store.dispatch({ type: constants.SHOW_MENU, payload: { id, event } })
}

export const hideMenu = () => {
  store.dispatch({ type: constants.HIDE_MENU })
}
