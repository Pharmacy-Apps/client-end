import React from 'react'

import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as constants from 'reducers/constants'

import Requests, { endPoints } from 'requests'

import { IonContent, IonPage } from '@ionic/react'

type Props = {
  history: History,
  showLoading: () => {},
  hideLoading: () => {},
  showToast: (e: string) => {},
}

/* 
 *Terms of operation, Privacy policy
 * 
 */

class Component extends React.Component<Props> {

  state = { text: undefined }

  componentDidMount() {
    const { showLoading, hideLoading, showToast } = this.props
    showLoading()
    Requests.get(endPoints['tcs']).then((response: any) => {
      this.setState({ text: response })
    }).catch(err => {
      this.setState({ text: null })
      console.error(err)
      showToast(err.error || err.toString())
    }).finally(hideLoading)
  }

  render() {
    const { text } = this.state
    return (
      <IonPage>
        <IonContent className="ion-padding">{text}</IonContent>
      </IonPage>
    )
  }

}

const mapDispatchToProps = (dispatch: any) => bindActionCreators({
  showLoading: () => ({
    type: constants.SHOW_LOADING
  }),
  hideLoading: () => ({
    type: constants.HIDE_LOADING
  }),
  showToast: (payload: string) => ({
    type: constants.SHOW_TOAST,
    payload
  })
}, dispatch)

export default connect(null, mapDispatchToProps)(Component)
