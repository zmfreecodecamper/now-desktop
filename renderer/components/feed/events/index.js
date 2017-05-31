// Native
import qs from 'querystring'

// Packages
import electron from 'electron'
import React from 'react'
import { object } from 'prop-types'
import moment from 'moment'
import dotProp from 'dot-prop'
import ms from 'ms'

// Components
import Avatar from '../avatar'
import messageComponents from './messages'

class EventMessage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      url: null
    }

    this.remote = electron.remote || false
    this.menu = null
  }

  click(event) {
    event.preventDefault()

    if (!this.state.url) {
      return
    }

    if (!this.remote) {
      return
    }

    this.remote.shell.openExternal(`https://${this.state.url}`)
  }

  rightClick(event) {
    event.preventDefault()

    if (!this.menu) {
      return
    }

    this.menu.popup({
      x: event.clientX,
      y: event.clientY
    })
  }

  copyToClipboard(text, type) {
    if (!this.remote) {
      return
    }

    const notify = this.remote.require('./notify')
    this.remote.clipboard.writeText(text)

    notify({
      title: 'Copied to Clipboard',
      body: `Your clipboard now contains the selected ${type}.`
    })
  }

  getID() {
    const info = this.props.content

    const props = [
      'payload.deletedUser.username',
      'payload.slug',
      'payload.aliasId',
      'payload.deploymentId'
    ]

    for (const prop of props) {
      const id = dotProp.get(info, prop)

      if (id) {
        return id
      }
    }

    return null
  }

  getDashboardURL() {
    const content = this.props.content

    if (content.type !== 'deployment') {
      return null
    }

    const { currentUser, team } = this.props
    const payload = content.payload
    const host = payload.deploymentUrl || payload.url
    const [, app, id] = (host || '').match(/^(.+)-([^-]+)\.now\.sh$/) || []

    if (!app || !id) {
      return null
    }

    const handle = team ? team.slug : currentUser.username
    const userId = currentUser.uid

    return '/deployment?' + qs.stringify({ handle, userId, host })
  }

  componentDidMount() {
    if (!this.remote) {
      return
    }

    const Menu = this.remote.Menu
    const eventItem = this
    const menuContent = []

    if (this.state.url) {
      menuContent.push({
        label: 'Copy Address',
        click() {
          const url = `https://${eventItem.state.url}`
          eventItem.copyToClipboard(url, 'address')
        }
      })
    }

    const identificator = this.getID()
    const dashboardURL = this.getDashboardURL()

    if (identificator) {
      menuContent.push({
        label: 'Copy ID',
        click() {
          eventItem.copyToClipboard(identificator, 'ID')
        }
      })
    }

    if (dashboardURL) {
      if (menuContent.length > 0) {
        menuContent.push({
          type: 'separator'
        })
      }

      menuContent.push({
        label: 'Open in Dashboard',
        click() {
          if (!eventItem.remote) {
            return
          }

          eventItem.remote.shell.openExternal(`https://zeit.co${dashboardURL}`)
        }
      })
    }

    if (menuContent.length === 0) {
      return
    }

    this.menu = Menu.buildFromTemplate(menuContent)
  }

  componentWillMount() {
    const info = this.props.content

    const urlProps = [
      'payload.cn',
      'payload.alias',
      'payload.url',
      'payload.domain',
      'payload.deploymentUrl'
    ]

    for (const prop of urlProps) {
      const url = dotProp.get(info, prop)

      if (url) {
        this.setState({ url })
        break
      }
    }
  }

  parseDate(date) {
    const parsed = moment(new Date())
    const difference = parsed.diff(date)

    const checks = {
      '1 minute': 'seconds',
      '1 hour': 'minutes',
      '1 day': 'hours',
      '7 days': 'days',
      '30 days': 'weeks',
      '1 year': 'months'
    }

    for (const check in checks) {
      if (!{}.hasOwnProperty.call(checks, check)) {
        continue
      }

      const unit = checks[check]
      const shortUnit = unit.charAt(0)

      if (difference < ms(check)) {
        return parsed.diff(date, unit) + shortUnit
      }
    }

    return null
  }

  render() {
    const info = this.props.content
    const Message = messageComponents.get(info.type)

    if (!Message) {
      return null
    }

    const messageRef = element => {
      this.message = element
    }

    return (
      <figure
        className="event"
        onClick={this.click.bind(this)}
        onContextMenu={this.rightClick.bind(this)}
      >
        <Avatar event={info} team={this.props.team} />

        <figcaption ref={messageRef}>
          <Message
            event={info}
            user={this.props.currentUser}
            team={this.props.team}
          />

          <span>{this.parseDate(info.created)}</span>
        </figcaption>

        <style jsx>
          {`
          figure {
            margin: 0;
            display: flex;
            justify-content: space-between;
          }

          figure:hover {
            background: #F5F5F5;
          }

          figure figcaption {
            border-top: 1px solid #F5F5F5;
            padding: 10px 10px 10px 0;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            flex-shrink: 1;
            word-break: break-word;
            flex-grow: 1;
          }

          figure:last-child figcaption {
            padding-bottom: 10px;
          }

          figure:last-child figcaption {
            border-bottom: 0;
          }

          figure figcaption span {
            font-size: 10px;
            color: #9B9B9B;
            flex-shrink: 0;
          }
        `}
        </style>

        <style jsx global>
          {`
          h1 + .event figcaption {
            border-top: 0 !important;
          }

          .event p {
            font-size: 12px;
            margin: 0;
            line-height: 17px;
            display: block;
            color: #666;
            padding-right: 10px;
            flex-shrink: 1;

          }

          .event p b {
            font-weight: normal;
            color: #000;
          }

          .event p code {
            font-family: Menlo, Monaco, Lucida Console, Liberation Mono, serif;
            background: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 12px;
            margin: 5px 0;
            display: block;
          }

          .event:hover p code {
            background: #e8e8e8;
          }

          .event:hover + .event figcaption {
            border-top-color: transparent;
          }
        `}
        </style>
      </figure>
    )
  }
}

EventMessage.propTypes = {
  content: object,
  currentUser: object,
  team: object
}

export default EventMessage
