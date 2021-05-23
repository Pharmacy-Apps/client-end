import React from 'react'
import Routes from 'routes'
import { History } from 'history'

import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as constants from 'reducers/constants'

import {
  IonContent,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react'
import { RefresherEventDetail } from '@ionic/core'
import { chevronDown as down, person, chevronUp as up } from 'ionicons/icons'

import { Header, ItemRequest } from 'components'
import { Select as SelectPopover } from 'containers'

import { State as ReducerState } from 'reducers'
import {
  Courier as CourierInterface,
  ItemRequest as ItemRequestInterface,
  ToolbarAction,
} from 'types'

import getMenuActions from './menu-actions'

import Requests, { endPoints } from 'requests'

import eventsInstance, {
  requestCreate as requestCreateAction,
  requestUpdate as requestUpdateAction,
  syncData as syncDataAction,
} from '../../events'

import { userIsAdmin, userIsClientUser, userIsNotClientUser } from 'utils/role'
import { getActiveRequests, getArchivedRequests } from 'utils'
import { setActiveRequestsPresence } from 'session'

import OrderButton from './OrderButton'
import { TItemRequestClickAction } from './types'

type Props = {
  history: History
  location: {
    pathname: string
  }
  requests: undefined | Array<ItemRequestInterface>
  setItemRequests: (e: Array<ItemRequestInterface> | null) => {}
  showLoading: () => {}
  hideLoading: () => {}
  showToast: (e: string) => {}
  hideToast: () => {}
}

const title = 'Orders'
const placeholderText = userIsClientUser()
  ? 'Your orders will show here'
  : 'Orders will appear here'

class Component extends React.Component<Props> {
  state = {
    renderContent: false,
    courierPopoverShown: false,
    requestDetailed: null,
    requestsSelected: [] as Array<String>,
    requestSelectedFromActionMenu: null as String | null,
    archivedRequestsShown: false,
    couriers: undefined,
  }

  toolbarActions = () => {
    const { history, showLoading, hideLoading, showToast } = this.props
    const { requestsSelected } = this.state

    const defaultToolbarActions: Array<ToolbarAction> = [
      {
        icon: person,
        handler: () => history.push(Routes.account.path),
      },
    ]

    if (userIsClientUser()) return defaultToolbarActions

    if (requestsSelected.length > 0) {
      const updateBackend = (body: Object) => {
        showLoading()
        Requests.put(endPoints['item-requests'], {
          ...this.defaultUpdateRequestBody(),
          update: body,
        })
          .then(this.updateRequestsUI)
          .catch(err => {
            console.error(err)
            showToast(err.error || err.toString())
          })
          .finally(hideLoading)
      }

      switch (window.location.pathname) {
        case Routes.requests.path:
          return [
            {
              text: 'Mark as Received',
              handler: () => {
                updateBackend({ state: 5 }) // received
              },
            },
            {
              text: 'Cancel',
              handler: () => {
                updateBackend({ state: 3 }) // cancelled
              },
            },
          ]
        case Routes.courier.path:
          return [
            {
              text: 'Mark as Delivered',
              handler: () => {
                updateBackend({ state: 4 }) // delivered
              },
            },
          ]
        case Routes.admin.path:
          return [
            {
              text: 'Assign to Courier',
              handler: this.onAssignCourier,
            },
          ]
        default:
          return defaultToolbarActions
      }
    } else {
      return defaultToolbarActions
    }
  }

  defaultUpdateRequestBody = (
    requestsSelected: Array<String> = this.state.requestsSelected
  ) => ({
    'item-requests': requestsSelected,
  })

  updateBackend = (body: Object, requestsSelected?: Array<String>) => {
    const { showLoading, hideLoading, showToast } = this.props
    showLoading()
    Requests.put(endPoints['item-requests'], {
      ...this.defaultUpdateRequestBody(requestsSelected),
      update: body,
    })
      .then(this.updateRequestsUI)
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error(err)
        showToast(err.error || err.toString())
      })
      .finally(hideLoading)
  }

  /**
   * Reponse ("response"), a result of item request updates from either
   * Axios requests by current user
   * Or events from other user
   *
   * */
  updateRequestsUI = (response: any, prependRequests?: true) => {
    const { requests: r, showToast, hideToast, setItemRequests } = this.props
    let requests = r ? [...r] : []
    if (prependRequests) {
      requests = response.concat(requests)
    } else {
      response.forEach((request: ItemRequestInterface) => {
        const index = requests.findIndex(o => o._id === request._id)
        requests[index] = {
          ...requests[index],
          ...request,
        }
      })
    }
    hideToast()
    setItemRequests(requests)
    this.setState(
      { requestsSelected: [], requestSelectedFromActionMenu: null },
      () => {
        const archivedRequests = getArchivedRequests(response)
        if (archivedRequests.length)
          setTimeout(() => {
            showToast(
              `${archivedRequests.length} ${
                archivedRequests.length > 1 ? 'requests' : 'request'
              } archived`
            )
          }, 400)
        setActiveRequestsPresence(
          requests.length > getArchivedRequests(requests).length
        )
      }
    )
  }

  onPrimaryAction = () => {
    this.props.history.push(Routes.search.path)
  }

  onRequestTapped = (action: TItemRequestClickAction, request: string) => {
    const { requestDetailed, requestsSelected } = this.state

    switch (action) {
      case 'select-item': {
        const index = requestsSelected.indexOf(request)
        if (index < 0) {
          requestsSelected.push(request)
        } else requestsSelected.splice(index, 1)
        this.setState({ requestsSelected })
        break
      }
      case 'show-detail': {
        if (userIsClientUser()) {
          this.props.history.push(Routes.request.path, {
            request: (this.props.requests || []).find(
              ({ _id }) => _id === request
            ),
          })
        } else
          this.setState({
            requestDetailed: request === requestDetailed ? null : request,
          })
        break
      }
      case 'show-menu': {
        this.setState({ requestSelectedFromActionMenu: request })
        break
      }
    }
  }

  onAssignCourier = () => {
    this.setState({
      courierPopoverShown: true,
    })
  }

  onCourierSelected = (courier: string) => {
    this.setState({ courierPopoverShown: false }, () => {
      const { showLoading, hideLoading, showToast } = this.props
      showLoading()
      Requests.put(endPoints['item-requests'], {
        ...this.defaultUpdateRequestBody([
          this.state.requestSelectedFromActionMenu || '',
        ]),
        update: { courier, state: 2 },
      })
        .then(this.updateRequestsUI)
        .catch(err => {
          console.error(err)
          showToast(err.error || err.toString())
        })
        .finally(hideLoading)
    })
  }

  onCourierPopoverDismiss = () => {
    this.setState({
      courierPopoverShown: false,
      requestSelectedFromActionMenu: null,
    })
  }

  onArchives = () => {
    const { archivedRequestsShown } = this.state
    this.setState({ archivedRequestsShown: !archivedRequestsShown })
  }

  syncRequestData = (event?: CustomEvent<RefresherEventDetail>) => {
    this.fetchRequests(false, () => {
      event && event.detail.complete()
    })
  }

  fetchRequests(animate: boolean = true, cb?: Function) {
    const { showLoading, hideLoading, showToast, setItemRequests } = this.props
    if (animate) showLoading()
    Requests.get(endPoints['item-requests'])
      .then((response: any) => {
        setItemRequests(response)
        setActiveRequestsPresence(
          response.length > getArchivedRequests(response).length
        )
      })
      .catch(err => {
        console.error(err)
        showToast(err.error || err.toString())
      })
      .finally(() => {
        this.setState({ renderContent: true })
        hideLoading()
        cb && cb()
      })
  }

  fetchCouriers() {
    const { showToast } = this.props
    Requests.get(endPoints['couriers'])
      .then((response: any) => {
        this.setState({
          couriers: response.map((o: CourierInterface) => ({
            label: o.name,
            value: o._id,
          })),
        })
      })
      .catch(err => {
        console.error(err)
        showToast(err.error || err.toString())
      })
  }

  componentDidMount() {
    this.fetchRequests()
    if (userIsAdmin()) this.fetchCouriers()
    this.setEventListeners()
  }

  setEventListeners = () => {
    eventsInstance.removeAllListeners()
    const fn = (result: Array<ItemRequestInterface>) => {
      this.updateRequestsUI(result, true)
    }
    eventsInstance.on(requestCreateAction, fn)
    eventsInstance.on(requestUpdateAction, this.updateRequestsUI)
    eventsInstance.on(syncDataAction, this.syncRequestData)
  }

  render() {
    const {
      renderContent,
      courierPopoverShown,
      requestDetailed,
      requestsSelected,
      archivedRequestsShown,
      couriers = [],
    } = this.state

    const { requests = [], requests: requestsReturned } = this.props

    const activeRequests = getActiveRequests(requests)
    const archivedRequests = getArchivedRequests(requests)

    const selectModeOn = userIsNotClientUser() && requestsSelected.length > 0

    const requestComponent = (
      item: any,
      i: number,
      a: Array<ItemRequestInterface>
    ) => (
      <div key={item._id}>
        <IonItem
          button
          onClick={() => this.onRequestTapped('select-item', item._id)}
          className={`request ${
            selectModeOn ? 'select-mode' : ''
          } ion-no-padding`}
          style={{ paddingTop: 0, paddingBottom: 0 }}
        >
          <ItemRequest
            item={item}
            detailed={item._id === requestDetailed}
            selected={requestsSelected.includes(item._id)}
            selectModeOn={selectModeOn}
            onTap={this.onRequestTapped}
            actions={getMenuActions(this.updateBackend, this.onAssignCourier)}
          />
        </IonItem>
        {i === a.length - 1 ? null : (
          <IonItemDivider style={{ minHeight: 0 }} />
        )}
      </div>
    )

    return renderContent ? (
      <IonPage>
        <Header omitsBack title={title} actions={this.toolbarActions()} />
        <IonContent>
          <IonRefresher slot="fixed" onIonRefresh={this.syncRequestData}>
            <IonRefresherContent></IonRefresherContent>
          </IonRefresher>
          {requests.length ? (
            <IonList style={{ paddingTop: 0, paddingBottom: 0 }} lines="none">
              {activeRequests.map(requestComponent)}
              {archivedRequests.length ? (
                <IonItem
                  button
                  onClick={this.onArchives}
                  className="ion-item-archive"
                  lines="none"
                >
                  <IonLabel className="ion-no-margin ion-text-center">
                    <p className="ion-label-secondary">Archived</p>
                  </IonLabel>
                  <IonIcon
                    className="ion-no-margin ion-icon-secondary"
                    icon={archivedRequestsShown ? up : down}
                    slot="end"
                  ></IonIcon>
                </IonItem>
              ) : null}
              {archivedRequestsShown
                ? archivedRequests.map(requestComponent)
                : null}
            </IonList>
          ) : (
            <div className="ion-padding">
              <IonLabel>
                <p>{placeholderText}</p>
              </IonLabel>
            </div>
          )}
          <OrderButton
            onClick={this.onPrimaryAction}
            activeRequestsPresent={activeRequests.length > 0}
            requestsReturned={Boolean(requestsReturned)}
          />
          <SelectPopover
            open={courierPopoverShown}
            items={couriers}
            onDismiss={this.onCourierPopoverDismiss}
            onSelect={this.onCourierSelected}
          />
        </IonContent>
      </IonPage>
    ) : null
  }
}

const mapStateToProps = (state: ReducerState) => ({
  requests: state.App.requests || undefined,
})

const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      setItemRequests: payload => ({
        type: constants.SET_ITEM_REQUESTS,
        payload,
      }),
      showLoading: () => ({
        type: constants.SHOW_LOADING,
      }),
      hideLoading: () => ({
        type: constants.HIDE_LOADING,
      }),
      showToast: (payload: string) => ({
        type: constants.SHOW_TOAST,
        payload,
      }),
      hideToast: () => ({
        type: constants.HIDE_TOAST,
      }),
    },
    dispatch
  )

export const RequestsPage = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component)
