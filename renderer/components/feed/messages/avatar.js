// Components
import Message from './message'

export default class Avatar extends Message {
  render() {
    return (
      <p>
        {this.getDisplayName()}
        updated your avatar
      </p>
    )
  }
}
